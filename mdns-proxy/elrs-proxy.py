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

POST_HEADERS = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With, X-FileSize',
}

@app.get('/mdns', method=['GET'])
def mdns():
    response.status = 200
    response.set_header('Access-Control-Allow-Origin', '*')
    return json.dumps(mdnsServices)

@app.get('/<path:path>', method=['GET', 'OPTIONS'])
def get(path):
    response.set_header('Access-Control-Allow-Origin', '*')
    qstring = request.query_string
    qstring = ('?' + qstring) if qstring else ''
    url = '{}://{}{}'.format(request.urlparts[0], path, qstring)
    ct = request.content_type
    header = {'Content-Type': ct} if ct else None

    if request.method == 'GET':
        r = requests.get(url, headers=header)
        response.status = r.status_code
        return r.text
    else:
        for k, v in POST_HEADERS.items():
            response.set_header(k, v)
        return

@app.get('/<path:path>', method=['POST'])
def get(path):
    response.set_header('Access-Control-Allow-Origin', '*')
    qstring = request.query_string
    qstring = ('?' + qstring) if qstring else ''
    url = '{}://{}{}'.format(request.urlparts[0], path, qstring)

    form_data = request.forms.dict
    file_data = request.files.get('upload')
    files = {file_data.name: (file_data.filename, file_data.file)} if file_data is not None else None
    headers = {}
    for k, v in request.headers.items():
        headers[k] = v
    headers.pop('Content-Type')
    r = requests.post(url, data=form_data, files=files, headers=headers)

    response.status = r.status_code
    return r.text

try:
    print('Starting ELRS proxy on port {}'.format(PORT))
    print("Press ^C to exit...\n")
    app.run(host='0.0.0.0', port=PORT, quiet=True)
finally:
    zeroconf.close()
