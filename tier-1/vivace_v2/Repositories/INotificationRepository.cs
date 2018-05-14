using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;

namespace vivace.Repositories
{
    /// <summary>
    /// Repository for sending notifications
    /// </summary>
    public interface INotificationRepository
    {
        /// <summary>
        /// Sends a notification to a device with "Vivace" as the title.
        /// </summary>
        /// <param name="title">title of message</param>
        /// <param name="message">body of message</param>
        /// <param name="deviceId">ID of device to send to</param>
        /// <returns></returns>
        Task<HttpResponseMessage> SendNotification(string title, string message, string deviceId);
    }
}
