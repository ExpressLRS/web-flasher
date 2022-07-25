#ifdef _WIN32
#define _CRT_SECURE_NO_WARNINGS 1
#endif

#include <stdio.h>

#include "mdns.h"
#include "hashmap.h"

#include <errno.h>
#include <signal.h>
#include <time.h>

#ifdef _WIN32
#include <iphlpapi.h>
#else
#include <arpa/inet.h>
#define closesocket close
#endif

extern int* open_mdns_sockets();
extern const char *send_mdns_query(mdns_query_t query);

extern const char *
send_mdns_query_old(mdns_query_t* query, size_t count);
void process_mdns_response(int isock, void (*handler)(const char *name, const char *json));

int running = 1;
fd_set active_fd_set, response_fd_set, mdns_fd_set;
struct {
    int peer;
    unsigned int started: 1;
} connection[FD_SETSIZE];

struct hashmap_s hashmap;


int output(int conn, const char *buffer, int nbytes)
{
    int sent = 0;
    while(nbytes) {
        int w = write(conn, buffer + sent, nbytes);
        if (w == -1) return -1;
        sent += w;
        nbytes -= w;
    }
    return sent;
}

void query_mdns()
{
    mdns_query_t query;

	query.name = "_http._tcp.local.";
	query.type = MDNS_RECORDTYPE_PTR;
	query.length = strlen(query.name);

    send_mdns_query(query);
}

void mdns_handler(const char *name, const char *json)
{
    // add to map
    if (0 != hashmap_put(&hashmap, name, strlen(name), strdup(json))) {
        // error!
    }
}

static int outcount = 0;
static int iterate(void* const context, void* const value)
{
    if (outcount != 0) {
        output(*(int*)context, (char *)",", 1);
    }
    output(*(int*)context, (char *)value, strlen((char *)value));
    outcount++;
    return 1;
}

int do_mdns_query(int conn)
{
    const char *header = "HTTP/1.1 200 OK\r\n"
        "Content-Type: application/json\r\n"
        "Connection: close\r\n"
        "Accept-Ranges: none\r\n"
        "Access-Control-Allow-Origin: *\r\n\r\n{";

    output(conn, header, strlen(header));
    outcount = 0;
    hashmap_iterate(&hashmap, iterate, &conn);
    output(conn, "}", 1);
    FD_CLR(conn, &active_fd_set);
    closesocket(conn);
    return 0;
}

int connect_client(int conn, const char *dest)
{
    int client;
    if((client = socket(AF_INET, SOCK_STREAM, 0)) < 0)
    {
        printf("Error : Could not create socket\n");
        return -1;
    }

    struct sockaddr_in serv_addr;
    memset(&serv_addr, 0, sizeof(serv_addr));

    serv_addr.sin_family = AF_INET;
    serv_addr.sin_port = htons(80);

    if(inet_pton(AF_INET, dest, &serv_addr.sin_addr)<=0)
    {
        printf("inet_pton error occured\n");
        return -1;
    }

    if(connect(client, (struct sockaddr *)&serv_addr, sizeof(serv_addr)) < 0)
    {
       printf("Error : Connect Failed\n");
       return -1;
    }

    connection[conn].peer = client;
    connection[conn].started = 1;
    connection[client].peer = conn;
    connection[client].started = 0;
    FD_SET(client, &active_fd_set);
    FD_SET(client, &response_fd_set);
    return client;
}

int process_request(int conn)
{
    char buffer[2048];
    int nbytes;

    nbytes = read (conn, buffer, 2048);
    if (nbytes < 0) {
        perror ("read");
        exit (EXIT_FAILURE);
    } else if (nbytes == 0) {
        return -1;
    } else {
        if (!connection[conn].started) {
            if (strncmp(buffer, "GET /mdns", 9) == 0) {
                return do_mdns_query(conn);
            } else if (strncmp(buffer, "POST ", 5) == 0 || strncmp(buffer, "GET ", 4) == 0) {
                // parse URL for target, and adjust and send data to peer
                char *space1 = strchr(buffer, ' ');
                char *slash = strchr(space1 + 2, '/');
                char dest[80]={0};
                memcpy(dest, space1+2, slash-(space1+2));
                nbytes -= slash-(space1+1);
                memcpy(space1+1, slash, buffer+2048-slash);
                int client = connect_client(conn, dest);
                if (client == -1) {
                    return -1;
                }
            } else if (strncmp(buffer, "OPTIONS ", 8) == 0) {
                // send back header only response for CORS
                const char *cors = "HTTP/1.1 204 No Content\r\n"
                    "Connection: keep-alive\r\n"
                    "Access-Control-Allow-Origin: *\r\n"
                    "Access-Control-Allow-Methods: POST, GET, OPTIONS\r\n"
                    "Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With, X-FileSize\r\n"
                    "Access-Control-Max-Age: 86400\r\n\r\n";
                return output(conn, cors, strlen(cors));
            }
        }
        return output(connection[conn].peer, buffer, nbytes);
    }
}

int process_response(int conn)
{
    char buffer[2049];
    int nbytes;

    nbytes = read (conn, buffer, 2048);
    buffer[nbytes] = 0;
    if (nbytes < 0) {
        perror ("read");
        exit (EXIT_FAILURE);
    } else if (nbytes == 0) {
        return -1;
    } else {
        int peer = connection[conn].peer;
        // forward data to peer
        if (!connection[conn].started) {
            // add in CORS header
            const char *header = "\r\nAccess-Control-Allow-Origin: *";
            const char *end = strstr(buffer, "\r\n\r\n");
            if (output(peer, buffer, end - buffer) == -1) return -1;
            if (output(peer, header, strlen(header)) == -1) return -1;
            return output(peer, end, nbytes - (end - buffer));
        }
        return output(peer, buffer, nbytes);
    }
    return -1;
}

int process_data(int conn)
{
    if (FD_ISSET(conn, &response_fd_set))
        return process_response(conn);
    return process_request(conn);
}

void startServer()
{
    int sockfd;
    struct sockaddr_in servaddr;

    fd_set read_fd_set;
    struct sockaddr_in clientname;
    socklen_t size;

    // socket create and verification
    sockfd = socket(AF_INET, SOCK_STREAM, 0);
    if (sockfd == -1) {
        printf("socket creation failed...\n");
        exit(0);
    } else printf("Socket successfully created..\n");
    memset(&servaddr, 0, sizeof(servaddr));

    // assign IP, PORT
    servaddr.sin_family = AF_INET;
    servaddr.sin_addr.s_addr = htonl(INADDR_ANY);
    servaddr.sin_port = htons(9097);

    // Binding newly created socket to given IP and verification
    if ((bind(sockfd, (struct sockaddr *)&servaddr, sizeof(servaddr))) != 0) {
        printf("socket bind failed...\n");
        exit(0);
    } else printf("Socket successfully bound..\n");

    // Now server is ready to listen and verification
    if ((listen(sockfd, 5)) != 0) {
        printf("Listen failed...\n");
        exit(0);
    } else printf("Server listening..\n");

    /* Initialize the set of active sockets. */
    FD_ZERO(&active_fd_set);
    FD_ZERO(&response_fd_set);
    FD_ZERO(&mdns_fd_set);
    FD_SET(sockfd, &active_fd_set);

    int *sockets = open_mdns_sockets();
    while(*sockets != -1) {
        FD_SET(*sockets, &active_fd_set);
        FD_SET(*sockets, &mdns_fd_set);
        sockets++;
    }

    query_mdns();

    while (running) {
		struct timeval timeout;
		timeout.tv_sec = 10;
		timeout.tv_usec = 0;


        /* Block until input arrives on one or more active sockets. */
        read_fd_set = active_fd_set;
        int s = select(FD_SETSIZE, &read_fd_set, NULL, NULL, &timeout);
        if (s < 0) {
            perror("select");
            return;
        }
        if (s == 0 || time(0) % 10 == 0) query_mdns();
        if (s == 0) continue;

        /* Service all the sockets with input pending. */
        for (int i = 0; i < FD_SETSIZE; ++i) {
            if (FD_ISSET(i, &read_fd_set)) {
                if (i == sockfd) {
                    /* Connection request on original socket. */
                    int client;
                    size = sizeof(clientname);
                    client = accept(sockfd, (struct sockaddr *)&clientname, &size);
                    if (client < 0) {
                        perror("accept");
                        return;
                    }
                    fprintf(stderr, "Server: connect from host %s, port %hd.\n", inet_ntoa(clientname.sin_addr), ntohs(clientname.sin_port));
                    FD_SET(client, &active_fd_set);
                    connection[client].started = 0;
                    connection[client].peer = -1;
                } else if (FD_ISSET(i, &mdns_fd_set)) {
                    // process MDNS response
                    process_mdns_response(i, mdns_handler);
                } else {
                    /* Data arriving on an already-connected socket. */
                    if (process_data(i) < 0) {
                        closesocket(i);
                        FD_CLR(i, &active_fd_set);
                        FD_CLR(i, &response_fd_set);
                        // get peer and close that too
                        int peer = connection[i].peer;
                        if (peer >= 0) {
                            closesocket(peer);
                            FD_CLR(peer, &active_fd_set);
                            FD_CLR(peer, &response_fd_set);
                        }
                    }
                }
            }
        }
    }
}

#ifdef _WIN32
BOOL console_handler(DWORD signal) {
	if (signal == CTRL_C_EVENT) {
		running = 0;
	}
	return TRUE;
}
#else
void signal_handler(int signal) {
	running = 0;
}
#endif

int main(int argc, char **argv)
{
#ifdef _WIN32
    WORD versionWanted = MAKEWORD(1, 1);
    WSADATA wsaData;
    if (WSAStartup(versionWanted, &wsaData)) {
        printf("Failed to initialize WinSock\n");
        return -1;
    }
	SetConsoleCtrlHandler(console_handler, TRUE);
#else
	signal(SIGINT, signal_handler);
#endif
    if (0 != hashmap_create(8, &hashmap)) {
        perror("Failed to create hashmap");
        exit(1);
    }

    startServer();
    for (int i=0 ; i<FD_SETSIZE ; i++) {
        if (FD_ISSET(i, &active_fd_set)) {
            printf("closing %d\n", i);
            closesocket(i);
        }
    }
#ifdef _WIN32
    WSACleanup();
#endif
}