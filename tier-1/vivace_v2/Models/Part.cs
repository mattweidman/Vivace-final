using Newtonsoft.Json;
using System.Collections.Generic;
using System.Runtime.Serialization;

namespace vivace.Models
{
    [DataContract]
    public class Part : ModelVivace
    {
        [DataMember, JsonProperty(PropertyName = "instrument")]
        public string Instrument { get; set; }

        [DataMember, JsonProperty(PropertyName = "song")]
        public string Song { get; set; }

        [DataMember, JsonProperty(PropertyName = "path")]
        public string Path { get; set; }
    }
}
