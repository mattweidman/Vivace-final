using Newtonsoft.Json;
using System.Collections.Generic;
using System.Runtime.Serialization;

namespace vivace.Models
{
    [DataContract]
    public class Player : ModelVivace
    {
        [DataMember, JsonProperty(PropertyName = "username")]
        public string Username { get; set; }

        [DataMember, JsonProperty(PropertyName = "bands")]
        public IEnumerable<string> Bands { get; set; }

        [DataMember, JsonProperty(PropertyName = "events")]
        public IEnumerable<string> Events { get; set; }

        [DataMember, JsonProperty(PropertyName = "deviceid")]
        public string DeviceId { get; set; }
    }
}
