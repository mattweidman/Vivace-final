using Microsoft.WindowsAzure.Storage;
using Microsoft.WindowsAzure.Storage.Blob;
using System;
using System.Threading.Tasks;

namespace vivace
{
    public class BlobRepository : IBlobRepository
    {
        private string ConnectionString = "Key removed for security reasons";

        private CloudBlobClient cloudBlobClient;

        public BlobRepository()
        {
            CloudStorageAccount.TryParse(ConnectionString, out CloudStorageAccount storageAccount);
            cloudBlobClient = storageAccount.CreateCloudBlobClient();
        }

        public async Task<string> UploadBlob(string container, string contents)
        {
            CloudBlobContainer cloudBlobContainer = cloudBlobClient.GetContainerReference(container);
            string blobName = Guid.NewGuid().ToString();
            CloudBlockBlob blob = cloudBlobContainer.GetBlockBlobReference(blobName);
            await blob.UploadTextAsync(contents);
            return blobName;
        }

        public async Task<string> DownloadBlob(string container, string name)
        {
            CloudBlobContainer cloudBlobContainer = cloudBlobClient.GetContainerReference(container);
            CloudBlockBlob blob = cloudBlobContainer.GetBlockBlobReference(name);
            return await blob.DownloadTextAsync();
        }

        public string GetBlobUri(string container, string blobName)
        {
            CloudBlobContainer cloudBlobContainer = cloudBlobClient.GetContainerReference(container);
            return cloudBlobContainer.Uri + "/" + blobName;
        }
    }
}
