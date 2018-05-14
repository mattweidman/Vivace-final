import os

device_id = "en8jHaOl7r0:APA91bGu60_GKHU1oBU2f6yWO8ExMO6A5qn-cHZK2K7EZUoVXwaKqzDE-VhIOoz7px9cpTScjeklNtqgJVYBIsAQ87SnCQ_-kugsQS44XSxJZnAXKdjSCC_PVzXAmSmv0m-0z0yHM17O"

payload = '\'{"data": {"title" : "Hello", "message" : "World"}, "to" : "/topics/topic" }\''

command = "phonegap push --deviceID %s --service fcm --payload %s" % (device_id, payload)

print command

os.system(command)