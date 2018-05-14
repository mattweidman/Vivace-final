
import urllib.request
import threading
import time

N = 50
NR = 1

errors = 0

URL = "http://10.148.1.255:5412"
URL = "http://10.132.3.83:5412"
TIMEOUT = 100

gatekeeper = threading.Condition()

def requestMeasure(name, n):

    with gatekeeper:
        gatekeeper.wait()

    for i in range(n):
        sendRequest()

def sendRequest():
    global errors
    try:
        with urllib.request.urlopen(URL, timeout=TIMEOUT) as response:
            if response.status != 200:
                raise Exception("Invalid response")
    except Exception as e:
        with gatekeeper:
            errors = errors + 1
            print(e)


if __name__ == "__main__":

    threads = []

    for i in range(N):
        thread = threading.Thread(name=str(i), target=requestMeasure, args=(str(i),NR))
        threads.append(thread)
        thread.start()

    time.sleep(1.0)

    pre_time = time.time()

    with gatekeeper:
        gatekeeper.notify_all()

    for thread in threads:
        thread.join()

    post_time = time.time()

    delta_time = post_time - pre_time

    print("errors: {}\ntime: {}".format(errors,delta_time))

    
