# Python 3 server for local testing
from http.server import BaseHTTPRequestHandler, HTTPServer
import time
import json
import psycopg2
import pprint
import pdb
import requestPistes

pp = pprint.PrettyPrinter(indent=4)
DEBUG = True
hostName = "localhost"
serverPort = 5106

class MyServer(BaseHTTPRequestHandler):
    def do_GET(self):
        if (self.path.find("request?")!=-1) :
            query=self.path[9:]
            if(DEBUG): print("query:" + query)
            response = requestPistes.requestPistes(query)
            if(DEBUG): pp.pprint(response)
            self.send_response(200)
            
            self.send_header("Content-type", "application/json")
            self.end_headers()
            self.wfile.write(bytes(response[0]))
        else:
            self.send_response(404)

if __name__ == "__main__":        
    webServer = HTTPServer((hostName, serverPort), MyServer)
    print("Server started http://%s:%s" % (hostName, serverPort))
    
    
    try:
        webServer.serve_forever()
    except KeyboardInterrupt:
        pass

    webServer.server_close()
    print("Server stopped.")

