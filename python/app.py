import tkinter as tk
import socket
import urllib.request
import urllib.error
import json
import threading
import time

from http.server import BaseHTTPRequestHandler as BaseHandler,HTTPServer

TIER1HOSTNAME = "http://vivace3.azurewebsites.net"
ADDRESS = "0.0.0.0"
PORT = 5412

TEMPO_UPDATE_FACTOR = .75
# If a timestamp takes longer than this many seconds,
#  it will not be used in tempo calculation
OUTLIER_TIME_DELTA = 6
# The number of timestamps to use in tempo calculation. Keep at 2 or more plz
TIME_MARK_LEN = 3

class InvalidResponseException(Exception):
    def __init__(self, msg):
        super(msg)

# upload IP address to Azure
def uploadIP(eventID):
    with socket.socket() as s:
        s.connect(("8.8.8.8",80))
        thisIP = s.getsockname()[0]
        print(thisIP)
        payload = {'trackerip' : thisIP}
        url = TIER1HOSTNAME + "/api/events/" + str(eventID) + "/changetrackerip"
        r = urllib.request.Request(url=url, method='PUT')
        r.add_header('Content-Type', 'application/json; charset=utf-8')
        data = json.dumps(payload).encode('utf-8')
        r.add_header('Content-Length', len(data))
        return urllib.request.urlopen(r, data)

# class representing GUI things
class VivaceWindow:

    def __init__(self):

        self.measure = 0
        self.tempo = 0

        self.lastTimeStamp = None
        self.timeMarks = []

        self.event_id = "" # default until real event_id added

        self.server = None

        # window
        self.root = tk.Tk()
        self.root.title("Vivace")

        # measure number label
        self.measureNumStr = tk.StringVar()
        self.measureNumLabel = tk.Label(self.root, text="")
        self.measureNumLabel.grid(row=0, column=1)
        self.setMeasureNumber(1)

        # inc/dec buttons
        self.dec_button = tk.Button(self.root, text="<", command = self.dec)
        self.dec_button.grid(row=1, column=0)
        self.inc_button = tk.Button(self.root, text=">", command = self.inc)
        self.inc_button.grid(row=1, column=2)

        # tempo display
        self.tempolabel = tk.Label(self.root, text="")
        self.tempolabel.grid(row=1, column=1)

        # measure setter
        self.setlabel = tk.Label(self.root, text="Set measure:")
        self.setlabel.grid(row=2, column=0)
        self.textsetter = tk.Entry(self.root, width=10)
        self.textsetter.grid(row=2, column=1)
        self.textenter = tk.Button(self.root, text="Enter", command = self.setToTextEntered)
        self.textenter.grid(row=2, column=2)

        # enter event ID
        self.eventlabel = tk.Label(self.root, text="Event ID: ")
        self.eventlabel.grid(row=3, column=0)
        self.eventidentry = tk.Entry(self.root, width=40)
        self.eventidentry.grid(row=3, column=1)
        self.eventidbutton = tk.Button(self.root, text="Upload IP address", command = self.uploadIPtoEventID)
        self.eventidbutton.grid(row=3, column=2)

        # error label
        self.errorlabel = tk.Label(self.root, text="", fg="red")
        self.errorlabel.grid(row=4,column=1)
        
        self.setMeasureNumber(0)
        self.setTempo(0)
    
    # increment measure number and change display
    def inc(self):
        self.setMeasureNumber(self.measure + 1)
        
        self.updateTempo()

    # decrement measure number and change display
    def dec(self):
        self.setMeasureNumber(self.measure - 1)
    
    # set measure number to what the user typed
    def setToTextEntered(self):
        try:
            inp = int(self.textsetter.get())
            self.setMeasureNumber(inp)
            self.setTempo(0)
        except ValueError:
            pass

    # change measure number
    def setMeasureNumber(self, x):
        if (x >= 0):
            self.measure = x
            self.measureNumLabel.configure(text="Measure number: " + str(x))

    def updateTempo(self):
        timeStamp = time.time()
        
        if self.lastTimeStamp == None:
            self.lastTimeStamp = timeStamp
            return

        timeDelta = timeStamp - self.lastTimeStamp

        self.lastTimeStamp = timeStamp

        if timeDelta > OUTLIER_TIME_DELTA:
            return

        if self.tempo == 0:
            self.setTempo(1/timeDelta)
        else:
            self.setTempo(self.tempo * (1-TEMPO_UPDATE_FACTOR) + (1/(timeDelta) * (TEMPO_UPDATE_FACTOR)))

        

    # change tempo
    def setTempo(self, t):
        if (t >= 0):
            self.tempo = t
            self.tempolabel.configure(text="Tempo: {:04.3f} measure/sec".format(self.tempo))
    
    # display everything
    def display(self):
        self.root.mainloop()

    def uploadIPtoEventID(self):
        eventID = self.eventidentry.get()
        self.errorlabel.configure(text="", fg="red")
        try:
            response = uploadIP(eventID)
            if response.status != 200:
                raise InvalidResponseException("Invalid response status: {} {}".format(response.status, response.reason))

            self.errorlabel.configure(text="Uploaded IP address successfully", fg="green")            
        except urllib.error.URLError as e:
            self.errorlabel.configure(text=str(e))
        except InvalidResponseException as e:
            self.errorlabel.configure(text=str(e))
                                               

    def addServer(self, server):
        self.server = server
        serverThread = threading.Thread(name="Server Thread", target=server.serve_forever)
        serverThread.start()

vw = VivaceWindow()

class MainHandler(BaseHandler):

    def _set_headers(self):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
    
    def do_GET(self):
        self._set_headers()
        results = json.dumps({"measure":vw.measure, "tempo":vw.tempo})
        print(results)
        self.wfile.write(results.encode('UTF-8'))
        return results.encode('UTF-8')

vw.addServer(HTTPServer( (ADDRESS,int(PORT)), MainHandler))
        
vw.display()
