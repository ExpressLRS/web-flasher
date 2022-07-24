#ifdef _WIN32
#define _CRT_SECURE_NO_WARNINGS 1
#endif

#include <stdio.h>

#include "mdns.h"

#include <errno.h>
#include <signal.h>

#ifdef _WIN32
#include <iphlpapi.h>
#else
#include <arpa/inet.h>
#define closesocket close
#endif

extern const char *send_mdns_query(mdns_query_t* query, size_t count);

int running = 1;
fd_set active_fd_set, response_fd_set;
struct {
    int peer;
    unsigned int started: 1;
} connection[FD_SETSIZE];

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

int do_mdns_query(int conn)
{
    const char *header = "HTTP/1.1 200 OK\r\n"
        "Content-Type: application/json\r\n"
        "Content-Length: %lu\r\n"
        "Connection: close\r\n"
        "Accept-Ranges: none\r\n"
        "Access-Control-Allow-Origin: *\r\n\r\n";
	mdns_query_t query[1];

	query[0].name = "_http._tcp.local.";
	query[0].type = MDNS_RECORDTYPE_PTR;
	query[0].length = strlen(query[0].name);

    const char *out = send_mdns_query(query, 1);
    if (out == NULL || strlen(out)==0) out = "{}";

    char head[256];
    sprintf(head, header, (unsigned long) strlen(out));
    output(conn, head, strlen(head));
    return output(conn, out, strlen(out));
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
                printf("forwarding to %s\n", dest);
                int client = connect_client(conn, dest);
                if (client == -1) {
                    return -1;
                }
                printf("connected to %s\n", dest);
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
    char buffer[2048];
    int nbytes;

    printf("response\n");
    nbytes = read (conn, buffer, 2048);
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
            const char *end = strnstr(buffer, "\r\n\r\n", nbytes);
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
    bzero(&servaddr, sizeof(servaddr));

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
    FD_SET(sockfd, &active_fd_set);

    while (running) {
        /* Block until input arrives on one or more active sockets. */
        read_fd_set = active_fd_set;
        if (select(FD_SETSIZE, &read_fd_set, NULL, NULL, NULL) < 0) {
            perror("select");
            return;
        }

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