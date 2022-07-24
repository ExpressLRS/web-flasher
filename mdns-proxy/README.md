Python
======
pip install zeroconf, gevent, bottle, requests

C
=
MacosX/Linux
cc -o epoxy proxy.c mdns.c

Windows
cl proxy.c mdns.c /out:epoxy.exe /link ws2_32.lib iphlpapi.lib
