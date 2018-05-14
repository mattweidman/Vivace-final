using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Documents;
using vivace.Models;
using vivace.Repositories;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace vivace.Controllers
{
    [Route("api/[controller]")]
    public class EventsController : ControllerVivace<Event>
    {
        public override string CollectionName { get { return ConstantNames.EVENTS; } }

        INotificationRepository notifRepo;

        public EventsController(ICosmosRepository cr, INotificationRepository nr) : base(cr)
        {
            notifRepo = nr;
        }

        /// <summary>
        /// Message returned when song not found in band.
        /// </summary>
        /// <param name="songId">song ID</param>
        /// <returns></returns>
        protected string SongNotInBandMessage(string songId)
        {
            return "Song " + songId + " not found in band";
        }

        // POST api/<controller>
        [HttpPost]
        public override async Task<IActionResult> Post([FromBody]Event docIn)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            // check required properties
            if (docIn.Name == null)
            {
                return MissingPropertyResult("name");
            }
            if (docIn.Band == null)
            {
                return MissingPropertyResult("band");
            }

            // remove unused properties
            docIn.Songs = new List<string>();
            docIn.Users = new List<string>();
            docIn.CurrentSong = null;

            // get band if it exists
            string bandId = docIn.Band;
            string bandCollection = ConstantNames.BANDS;
            Band band = null;
            try
            {
                band = await CosmosRepo.GetDocument<Band>(bandCollection, bandId);
            }
            catch (DocumentClientException)
            {
                return ItemNotFoundResult(bandId, bandCollection);
            }

            // create event
            Event created = await CosmosRepo.CreateDocument(CollectionName, docIn);
            string eventId = created.Id;

            // update band
            if (!band.Events.Contains(eventId))
            {
                List<string> events = band.Events.ToList();
                events.Add(eventId);
                band.Events = events;
                await CosmosRepo.ReplaceDocument(bandCollection, bandId, band);
            }

            return Created(GetGetUri(eventId), created);
        }

        // PUT api/<controller>/5/addsong/5
        [HttpPut("{eventid}/addsong/{songid}")]
        public async Task<IActionResult> AddSong(string eventid, string songid)
        {
            return await CheckAndChangeInDB<Band>(eventid, 
                event_ => event_.Band,
                ConstantNames.BANDS,
                band => band.Songs.Contains(songid),
                event_ =>
                {
                    List<string> songs = event_.Songs.ToList();
                    if (!songs.Contains(songid))
                    {
                        songs.Add(songid);
                        event_.Songs = songs;
                    }
                    return event_;
                },
                NotFound(SongNotInBandMessage(songid))
            );
        }

        // PUT api/<controller>/5/deletesong/5
        [HttpPut("{eventid}/deletesong/{songid}")]
        public async Task<IActionResult> DeleteSong(string eventid, string songid)
        {
            return await ChangeInDB(eventid, event_ =>
            {
                List<string> songs = event_.Songs.ToList();
                songs.Remove(songid);
                event_.Songs = songs;
                return event_;
            });
        }

        // PUT api/<controller>/5/rename
        [HttpPut("{eventid}/rename")]
        public async Task<IActionResult> Rename(string eventid, [FromBody]Event replacement)
        {
            if (replacement.Name == null)
            {
                return MissingPropertyResult("name");
            }

            return await ChangeInDB(eventid, event_ =>
            {
                event_.Name = replacement.Name;
                return event_;
            });
        }

        // PUT api/<controller>/5/changecurrentsong
        [HttpPut("{eventid}/notifysong")]
        public async Task<IActionResult> NotifySong(string eventid, [FromBody]Event replacement)
        {
            if (replacement.CurrentSong == null)
            {
                return MissingPropertyResult("currentsong");
            }

            // replace song
            string songId = replacement.CurrentSong;
            IActionResult result = await CheckAndChangeInDB<Band>(eventid,
                event_ => event_.Band,
                ConstantNames.BANDS,
                band => band.Songs.Contains(songId),
                event_ =>
                {
                    event_.CurrentSong = songId;
                    return event_;
                },
                NotFound(SongNotInBandMessage(songId))
            );

            // get song name
            string songName = songId;
            Song songResult = await CosmosRepo.GetDocument<Song>(ConstantNames.SONGS, songId);
            if (songResult != null)
            {
                songName = songResult.Name;
            }

            if (result is OkObjectResult okobj && okobj != null && okobj.Value is Event ev)
            {
                // for each user, send a notification to them
                List<string> userIds = ev.Users.ToList();
                foreach (string userId in userIds)
                {
                    Player u = await CosmosRepo.GetDocument<Player>(ConstantNames.PLAYERS, userId);
                    if (u != null)
                    {
                        string deviceId = u.DeviceId;
                        if (deviceId != null && deviceId != "FAILED_ID")
                        {
                            await notifRepo.SendNotification("Next song", songName, deviceId);
                        }
                    }
                }
            }

            return result;
        }

        // PUT api/<controller>/5/changetrackerip
        [HttpPut("{eventid}/changetrackerip")]
        public async Task<IActionResult> ChangeTrackerIp(string eventid, [FromBody]Event replacement)
        {
            if (replacement.TrackerIp == null)
            {
                return MissingPropertyResult("trackerip");
            }

            return await ChangeInDB(eventid, event_ =>
                {
                    event_.TrackerIp = replacement.TrackerIp;
                    return event_;
                });
        }

    }
}
