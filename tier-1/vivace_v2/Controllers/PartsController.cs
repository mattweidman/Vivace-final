using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Documents;
using vivace.Models;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace vivace.Controllers
{
    [Route("api/[controller]")]
    public class PartsController : ControllerVivace<Part>
    {
        public override string CollectionName { get { return ConstantNames.PARTS; } }

        private IBlobRepository BlobRepo;

        public PartsController(ICosmosRepository cr, IBlobRepository br) : base(cr)
        {
            BlobRepo = br;
        }

        // POST api/<controller>
        [HttpPost]
        public override async Task<IActionResult> Post([FromBody]Part docIn)
        {
            // make sure required fields are included
            if (docIn.Instrument == null)
            {
                return MissingPropertyResult("instrument");
            }
            if (docIn.Song == null)
            {
                return MissingPropertyResult("song");
            }
            docIn.Path = null;

            // make sure song exists
            string songsCollection = ConstantNames.SONGS;
            string songId = docIn.Song;
            Song song;
            try
            {
                song = await CosmosRepo.GetDocument<Song>(songsCollection, songId);
            }
            catch (DocumentClientException)
            {
                return ItemNotFoundResult(songId, songsCollection);
            }

            // create part
            Part newDoc = await CosmosRepo.CreateDocument(CollectionName, docIn);
            string partId = newDoc.Id;

            // update song
            if (!song.Parts.Contains(partId))
            {
                List<string> parts = song.Parts.ToList();
                parts.Add(partId);
                song.Parts = parts;
                await CosmosRepo.ReplaceDocument(songsCollection, songId, song);
            }

            return Created(GetGetUri(newDoc.Id), newDoc);
        }

        // POST api/<controller>/5/upload
        [HttpPost("{partid}/upload")]
        public async Task<IActionResult> UploadFile(string partId)
        {
            // get part
            Part part;
            try
            {
                part = await CosmosRepo.GetDocument<Part>(ConstantNames.PARTS, partId);
            }
            catch (DocumentClientException)
            {
                return ItemNotFoundResult(partId);
            }

            // read contents
            string contents;
            using (StreamReader reader = new StreamReader(Request.Body, Encoding.UTF8))
            {
                contents = await reader.ReadToEndAsync();
            }

            // upload blob
            string container = ConstantNames.XMLCONTAINER;
            string blobId = await BlobRepo.UploadBlob(container, contents);
            string uri = BlobRepo.GetBlobUri(container, blobId);

            // change part
            part.Path = blobId;
            await CosmosRepo.ReplaceDocument<Part>(ConstantNames.PARTS, partId, part);

            return Created(uri, contents);
        }

        // GET api/<controller>/5/download
        [HttpGet("{partid}/download")]
        public async Task<IActionResult> DownloadFile(string partId)
        {
            // get part
            Part part;
            try
            {
                part = await CosmosRepo.GetDocument<Part>(ConstantNames.PARTS, partId);
            }
            catch (DocumentClientException)
            {
                return ItemNotFoundResult(partId);
            }

            if (part.Path == null)
            {
                return BadRequest("Part does not yet have a corresponding music location");
            }

            string container = ConstantNames.XMLCONTAINER;
            string contents = await BlobRepo.DownloadBlob(container, part.Path);

            return Ok(contents);
        }

        // PUT api/<controller>/5/rename
        [HttpPut("{partid}/rename")]
        public async Task<IActionResult> Rename(string partid, [FromBody]Part replacement)
        {
            // make sure required fields are included
            if (replacement.Instrument == null)
            {
                return MissingPropertyResult("instrument");
            }

            return await ChangeInDB(partid, part =>
            {
                part.Instrument = replacement.Instrument;
                return part;
            });
        }
    }
}
