using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

namespace vivace.Repositories
{
    public class NotificationRepository : INotificationRepository
    {
        private string EndpointUrl = "http://push.api.phonegap.com:80/v1/push";

        public async Task<HttpResponseMessage> SendNotification(string msg_title, string msg_body, string deviceId)
        {
            HttpClient client = new HttpClient();

            // body
            var data = new {
                deviceID = deviceId,
                type = "fcm",
                appID = "com.adobe.phonegap.app",
                payload = new
                {
                    data = new
                    {
                        title = msg_title,
                        message = msg_body
                    }
                }
            };
            StringContent content = new StringContent(
                JsonConvert.SerializeObject(data), Encoding.UTF8, "application/json");

            // send
            HttpResponseMessage msg = await client.PostAsync(EndpointUrl, content);
            return msg;
        }
    }
}
