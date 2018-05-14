using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using vivace.Models;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace vivace.Controllers
{
    [Route("api/[controller]")]
    public class SongsController : ControllerVivace<Song>
    {
        public override string CollectionName { get { return ConstantNames.SONGS; } }

        public SongsController(ICosmosRepository cr) : base(cr)
        { }

        // POST api/<controller>
        [HttpPost]
        public override async Task<IActionResult> Post([FromBody]Song docIn)
        {
            // make sure a name is included
            if (docIn.Name == null)
            {
                return MissingPropertyResult("name");
            }

            // convert null parts into an empty list
            if (docIn.Parts == null)
            {
                docIn.Parts = new List<string>();
            }

            return await base.Post(docIn);
        }

        // PUT api/<controller>/5/addpart/5
        [HttpPut("{songid}/addpart/{partid}")]
        public async Task<IActionResult> AddPart(string songid, string partid)
        {
            string partsCollection = ConstantNames.PARTS;
            return await CheckAndChangeInDB<Part>(songid, 
                _ => partid,
                partsCollection,
                part => part != null,
                song =>
                {
                    List<string> parts = song.Parts.ToList();

                    if (!parts.Contains(partid))
                    {
                        parts.Add(partid);
                        song.Parts = parts;
                    }

                    return song;
                },
                ItemNotFoundResult(partid, partsCollection)
            );
        }

        // PUT api/<controller>/5/deletepart/5
        [HttpPut("{songid}/deletepart/{partid}")]
        public async Task<IActionResult> DeletePart(string songid, string partid)
        {
            return await ChangeInDB(songid, song =>
            {
                List<string> parts = song.Parts.ToList();
                parts.Remove(partid);
                song.Parts = parts;
                return song;
            });
        }

        // PUT api/<controller>/5/rename
        [HttpPut("{songid}/rename")]
        public async Task<IActionResult> Rename(string songid, [FromBody]Song replacement)
        {
            if (replacement.Name == null)
            {
                return MissingPropertyResult("name");
            }

            return await ChangeInDB(songid, song =>
            {
                song.Name = replacement.Name;
                return song;
            });
        }
    }
}
