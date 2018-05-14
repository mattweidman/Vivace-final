using System;
using System.Linq;
using System.Threading.Tasks;
using System.Xml;
using Microsoft.Azure.Documents;
using Microsoft.Azure.Documents.Client;
using Microsoft.Azure.Documents.Linq;

namespace vivace
{
    public class CosmosRepository : ICosmosRepository
    {
        //private const string XmlPath = "access.xml";
        private string EndpointUrl;
        private string PrimaryKey;
        private string DBName;

        private DocumentClient client;

        public CosmosRepository ()
        {
            //XmlDocument xml = new XmlDocument();
            //xml.Load(XmlPath);
            //EndpointUrl = xml.SelectSingleNode("/dbinfo/endpointurl").InnerText;
            //PrimaryKey = xml.SelectSingleNode("/dbinfo/primarykey").InnerText;
            //DBName = xml.SelectSingleNode("/dbinfo/dbname").InnerText;

            EndpointUrl = "https://vivace3.documents.azure.com:443/";
            PrimaryKey = "Key removed for security reasons";
            DBName = "Vivace";

            client = new DocumentClient(new Uri(EndpointUrl), PrimaryKey);
        }
        
        public async Task<T> GetDocument<T>(string collectionName, string id)
        {
            Document result = await client.ReadDocumentAsync(
                UriFactory.CreateDocumentUri(DBName, collectionName, id));

            return (dynamic)result;
        }

        public async Task<T> QueryDocument<T>(string collectionName, string sqlQuerySpec)
        {
            T docFound = default(T);
            bool notFound = false;
            await Task.Run(() =>
            {
                IQueryable<dynamic> results = client.CreateDocumentQuery(
                    UriFactory.CreateDocumentCollectionUri(DBName, collectionName), sqlQuerySpec);
                foreach (dynamic d in results)
                {
                    docFound = d;
                    return;
                }
                notFound = true;
            });

            if (notFound)
            {
                throw new DocumentQueryException("SQL query found nothing in " + collectionName);
            }
            return docFound;
        }

        public async Task<T> CreateDocument<T>(string collectionName, T obj)
        {
            return (dynamic)(Document)(await client.CreateDocumentAsync(
                UriFactory.CreateDocumentCollectionUri(DBName, collectionName), obj));
        }

        public async Task<T> ReplaceDocument<T>(string collectionName, string id, T obj)
        {
            return (dynamic)(Document)(await client.ReplaceDocumentAsync(
                UriFactory.CreateDocumentUri(DBName, collectionName, id), obj));
        }
    }
}
