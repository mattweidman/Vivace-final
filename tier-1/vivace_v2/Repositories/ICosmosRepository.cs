using Microsoft.Azure.Documents;
using System.Threading.Tasks;

namespace vivace
{
    public interface ICosmosRepository
    {
        /// <summary>
        /// Gets a document from a collection in the database.
        /// Returns null if not found.
        /// </summary>
        /// <typeparam name="T">Type of document to get</typeparam>
        /// <param name="collectionName">Name of collection</param>
        /// <param name="id">ID of value looking for</param>
        /// <exception cref="DocumentClientException"></exception>
        /// <returns></returns>
        Task<T> GetDocument<T>(string collectionName, string id);

        /// <summary>
        /// Create a new document in the database.
        /// </summary>
        /// <typeparam name="T">Type of document to create</typeparam>
        /// <param name="collectionName">Name of collection</param>
        /// <param name="obj">C# object to store as a JSON document</param>
        /// <exception cref="DocumentClientException"></exception>
        /// <returns></returns>
        Task<T> CreateDocument<T>(string collectionName, T obj);

        /// <summary>
        /// Replace a document in the database.
        /// </summary>
        /// <typeparam name="T">Type of document to replace</typeparam>
        /// <param name="collectionName">Name of collection</param>
        /// <param name="id">ID of document to replace</param>
        /// <param name="obj">C# object to store as JSON document</param>
        /// <exception cref="DocumentClientException"></exception>
        /// <returns></returns>
        Task<T> ReplaceDocument<T>(string collectionName, string id, T obj);

        /// <summary>
        /// Makes a query for a document using a SQL query. Null if not found.
        /// </summary>
        /// <typeparam name="T">Type of document to get</typeparam>
        /// <param name="collectionName">Name of collection</param>
        /// <param name="sqlQuerySpec">SQL query</param>
        /// <exception cref="DocumentClientException"></exception>
        /// <returns></returns>
        Task<T> QueryDocument<T>(string collectionName, string sqlQuerySpec);
    }
}
