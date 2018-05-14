using Newtonsoft.Json;
using System.Runtime.Serialization;

namespace vivace.Models
{
    /// <summary>
    /// Superclass of models in Vivace
    /// </summary>
    [DataContract]
    public abstract class ModelVivace
    {
        [DataMember, JsonProperty(PropertyName = "id")]
        public string Id { get; set; }
    }
}
