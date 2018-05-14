using Newtonsoft.Json;
using System.Collections.Generic;
using System.Runtime.Serialization;

namespace vivace.Models
{
    [DataContract]
    public class Song : ModelVivace
    {
        [DataMember, JsonProperty(PropertyName = "name")]
        public string Name { get; set; }

        [DataMember, JsonProperty(PropertyName = "parts")]
        public IEnumerable<string> Parts { get; set; }
    }
}
