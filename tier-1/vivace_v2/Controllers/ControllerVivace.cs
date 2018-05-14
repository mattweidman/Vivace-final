using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Documents;
using System;
using System.Threading.Tasks;
using vivace.Models;

namespace vivace.Controllers
{
    /// <summary>
    /// Superclass of controllers used in Vivace
    /// </summary>
    /// <typeparam name="T">Model type</typeparam>
    public abstract class ControllerVivace<T> : ControllerBase where T : ModelVivace
    {
        /// <summary>
        /// Name of this collection
        /// </summary>
        public abstract string CollectionName { get; }

        /// <summary>
        /// Collection of methods used to interract with Cosmos;
        /// used for dependency injection.
        /// </summary>
        protected ICosmosRepository CosmosRepo;

        /// <summary>
        /// Create a new Vivace controller
        /// </summary>
        /// <param name="cr">Cosmos repository</param>
        public ControllerVivace(ICosmosRepository cr)
        {
            CosmosRepo = cr;
        }

        /// <summary>
        /// Get hostname URL
        /// </summary>
        /// <returns></returns>
        protected string GetHost()
        {
            return Request.Host.ToString();
        }

        /// <summary>
        /// Gets the URI of a get request for some id
        /// </summary>
        /// <returns></returns>
        protected string GetGetUri(string id)
        {
            return GetHost() + $"/api/{CollectionName}/{id}";
        }

        /// <summary>
        /// Calls Cosmos to get a document by ID
        /// </summary>
        /// <param name="id">Document ID</param>
        /// <returns></returns>
        protected async Task<T> GetDocFromDB(string id)
        {
            return await CosmosRepo.GetDocument<T>(CollectionName, id);
        }

        /// <summary>
        /// Call Cosmos to replace a document by ID
        /// </summary>
        /// <param name="id">Document ID</param>
        /// <param name="replace">object to replace with</param>
        /// <returns></returns>
        protected async Task<T> ReplaceDocInDB(string id, T replace)
        {
            return await CosmosRepo.ReplaceDocument<T>(CollectionName, id, replace);
        }

        /// <summary>
        /// Response returned when request does not contain a required property
        /// </summary>
        /// <param name="props">string listing missing property</param>
        /// <returns></returns>
        protected IActionResult MissingPropertyResult(string props)
        {
            return BadRequest("Property required: " + props);
        }

        /// <summary>
        /// Result returned when an item is not found.
        /// </summary>
        /// <param name="id">ID not found</param>
        /// <param name="collName">Collection searched in</param>
        /// <returns></returns>
        protected IActionResult ItemNotFoundResult(string id, string collName)
        {
            return NotFound("ID " + id + " not found in " + collName);
        }

        /// <summary>
        /// Result returned when an item is not found in this collection.
        /// </summary>
        /// <param name="id">ID not found</param>
        /// <returns></returns>
        protected IActionResult ItemNotFoundResult(string id)
        {
            return ItemNotFoundResult(id, CollectionName);
        }

        // GET api/<controller>/5
        [HttpGet("{id}")]
        public async Task<IActionResult> Get(string id)
        {
            try
            {
                T doc = await GetDocFromDB(id);
                return Ok(doc);
            }
            catch (DocumentClientException)
            {
                return ItemNotFoundResult(id);
            }
        }

        // POST api/<controller>
        [HttpPost]
        public virtual async Task<IActionResult> Post([FromBody]T docIn)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            T newDoc = await CosmosRepo.CreateDocument(CollectionName, docIn);

            return Created(GetGetUri(newDoc.Id), newDoc);
        }

        /// <summary>
        /// Gets a document by ID, changes it in some way, 
        /// and replaces it in the database.
        /// </summary>
        /// <param name="id">Document ID</param>
        /// <param name="op">Function that converts document into new 
        /// document before replacing in database</param>
        /// <returns>HTTP result: 500 if error, 404 if ID not found, 
        /// else 200 with updated document</returns>
        protected async Task<IActionResult> ChangeInDB(string id, Func<T, T> op)
        {
            // check model state first
            if (!ModelState.IsValid)
            {
                return BadRequest();
            }

            // get item from DB
            T docGot;
            try
            {
                docGot = await GetDocFromDB(id);
            }

            // return 404 if not found
            catch (DocumentClientException)
            {
                return ItemNotFoundResult(id);
            }

            // use function
            T converted = op(docGot);

            // update database
            T result = await ReplaceDocInDB(id, converted);
            return Ok(result);
        }

        /// <summary>
        /// Gets documents of type T and U, changes them in some way,
        /// and replaces them in the database.
        /// </summary>
        /// <typeparam name="U">type of other document</typeparam>
        /// <param name="itemId">ID of type T document</param>
        /// <param name="otherId">ID of type U document</param>
        /// <param name="otherCollection">name of U collection</param>
        /// <param name="itemOp">operation on type T document</param>
        /// <param name="otherOp">operation on type U document </param>
        /// <returns></returns>
        protected async Task<IActionResult> ChangeTwoDBs<U>(string itemId, string otherId, 
            string otherCollection, Func<T, T> itemOp, Func<U, U> otherOp)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest();
            }

            // get item
            T item;
            try
            {
                item = await GetDocFromDB(itemId);
            }

            // check if item exists
            catch (DocumentClientException)
            {
                return ItemNotFoundResult(itemId);
            }

            // get other
            U other;
            try
            {
                other = await CosmosRepo.GetDocument<U>(otherCollection, otherId);
            }

            // check if other exists
            catch (DocumentClientException)
            {
                return ItemNotFoundResult(otherId, otherCollection);
            }

            // modify item
            T newItem = itemOp(item);

            // modify other
            U newOther = otherOp(other);

            // update in database
            await CosmosRepo.ReplaceDocument(otherCollection, otherId, newOther);
            return Ok(await ReplaceDocInDB(itemId, newItem));
        }

        /// <summary>
        /// Gets documents of type T and U, does some check on U, 
        /// and if U passes, changes T in some way and replaces T in the database.
        /// </summary>
        /// <typeparam name="U">type of other document</typeparam>
        /// <param name="itemId">ID of document to replace</param>
        /// <param name="getOtherId">way of getting ID of other document, given the item</param>
        /// <param name="otherCollection">collection to find other document in</param>
        /// <param name="itemOp">operation on item if check passes</param>
        /// <param name="check">should return true if other document passes check, else false</param>
        /// <param name="failResult">message returned if check fails</param>
        /// <returns></returns>
        protected async Task<IActionResult> CheckAndChangeInDB<U>(string itemId, Func<T, string> getOtherId,
            string otherCollection, Func<U, Boolean> check, Func<T, T> itemOp, IActionResult failResult)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest();
            }

            // get item
            T item;
            try
            {
                item = await GetDocFromDB(itemId);
            }

            // check if item exists
            catch (DocumentClientException)
            {
                return ItemNotFoundResult(itemId);
            }

            // get other
            string otherId = getOtherId(item);
            U other;
            try
            {
                other = await CosmosRepo.GetDocument<U>(otherCollection, otherId);
            }

            // check if other exists
            catch (DocumentClientException)
            {
                return ItemNotFoundResult(otherId, otherCollection);
            }

            // do check on other
            if (!check(other))
            {
                return failResult;
            }

            // modify item
            T newItem = itemOp(item);

            // update in database
            return Ok(await ReplaceDocInDB(itemId, newItem));
        }
    }
}
