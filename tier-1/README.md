# Vivace-tier-1-v2

This is the stateless Tier 1 server hosted as an Azure web app. It was written using ASP.NET. It uses a standard MVC architecture that is frequent in ASP.NET Web APIs. The code is organized into the following folders:
* Repositories: communicating with CosmosDB, Azure blob storage, and Adobe PhoneGap's notification server
* Models: representing database entities
* Controllers: responding to client requests

Cosmos and Azure Storage authorization keys have been removed from the code for security reasons.