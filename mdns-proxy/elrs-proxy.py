#!/usr/bin/python3

from typing import Dict
from zeroconf import ServiceBrowser, ServiceInfo, ServiceListener, Zeroconf
from bottle import Bottle, request, response
import requests
import json
import socket

mdnsServices = {}

class MDNSListener(ServiceListener):
    def convert(self, info: ServiceInfo) -> Dict:
        d = {}
        d['name'] = info.name
        d['address'] = socket.inet_ntoa(info.addresses[0])
        d['port'] = info.port
        d['properties'] = {}
        for k,v in info.properties.items():
            d['properties'][k.decode('utf-8')] = v.decode('utf-8')
        return d

    def update_service(self, zc: Zeroconf, type_: str, name: str) -> None:
        info = zc.get_service_info(type_, name)
        device = self.convert(info)
        if 'vendor' in device['properties'] and device['properties']['vendor'] == 'elrs':
            mdnsServices[name] = device
            print('Device updated: ' + name)

    def remove_service(self, zc: Zeroconf, type_: str, name: str) -> None:
        if mdnsServices.pop(name) != None:
            print('Device removed: ' + name)

    def add_service(self, zc: Zeroconf, type_: str, name: str) -> None:
        info = zc.get_service_info(type_, name)
        device = self.convert(info)
        if 'vendor' in device['properties'] and device['properties']['vendor'] == 'elrs':
            mdnsServices[name] = device
            print('Device added: ' + name)

zeroconf = Zeroconf()
listener = MDNSListener()
browser = ServiceBrowser(zeroconf, "_http._tcp.local.", listener)

PORT = 9097

app = Bottle()

METHODS = ['GET', 'POST', 'OPTIONS']
POST_HEADERS = {
    'Access-Control-Allow-Methods': ', '.join(METHODS),
    'Access-Control-Allow-Headers': 'Content-Type, '
    'Access-Control-Allow-Headers, Authorization, X-Requested-With',
}

@app.get('/mdns', method=['GET'])
def mdns():
    response.status = 200
    response.set_header('Access-Control-Allow-Origin', '*')
    return json.dumps(mdnsServices)

@app.get('/<path:path>', method=METHODS)
def get(path):
    response.set_header('Access-Control-Allow-Origin', '*')
    qstring = request.query_string
    qstring = ('?' + qstring) if qstring else ''
    url = '{}://{}{}'.format(request.urlparts[0], path, qstring)
    ct = request.content_type
    header = {'Content-Type': ct} if ct else None

    if request.method == 'GET':
        r = requests.get(url, headers=header)
    else:
        for k, v in POST_HEADERS.items():
            response.set_header(k, v)

        if request.method == 'OPTIONS':
            return

        r = requests.post(url, data=request.body.read(), headers=header)

    response.status = r.status_code
    return r.text

@app.get('/', method=METHODS)
def getroot():
    return get(None)

try:
    print('Starting ELRS proxy on port {}'.format(PORT))
    print("Press ^C to exit...\n")
    app.run(host='0.0.0.0', port=PORT, quiet=True)
finally:
    zeroconf.close()
