using System.Threading.Tasks;

namespace vivace
{
    /// <summary>
    /// Interface for communicating with Azure Blob Storage
    /// </summary>
    public interface IBlobRepository
    {
        /// <summary>
        /// Uploads a text blob to blob storage.
        /// </summary>
        /// <typeparam name="T">type of blob</typeparam>
        /// <param name="container">name of blob container</param>
        /// <param name="contents">blob to upload</param>
        /// <returns>name of new blob</returns>
        Task<string> UploadBlob(string container, string contents);

        /// <summary>
        /// Downloads a blob from blob storage.
        /// </summary>
        /// <typeparam name="T">type of blob</typeparam>
        /// <param name="container">name of blob container</param>
        /// <param name="url">name of blob</param>
        /// <returns>contents of blob</returns>
        Task<string> DownloadBlob(string container, string name);

        /// <summary>
        /// Constructs the URI for a blob.
        /// </summary>
        /// <param name="container">name of container</param>
        /// <param name="blobName">name of blob</param>
        /// <returns></returns>
        string GetBlobUri(string container, string blobName);
    }
}
