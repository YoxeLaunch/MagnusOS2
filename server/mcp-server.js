import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { listContainers } from "./services/dockerService.js";

// Create an MCP server
const server = new McpServer({
    name: "magnus-docker-mcp",
    version: "1.0.0"
});

// Add a tool to list docker containers
server.tool(
    "list_containers",
    "List all docker containers on the host system",
    {}, // No arguments needed
    async () => {
        try {
            const containers = await listContainers();

            // Formatting the output for better readability by the LLM
            const formatted = containers.map(c => ({
                Id: c.Id.substring(0, 12),
                Names: c.Names,
                Image: c.Image,
                State: c.State,
                Status: c.Status,
                Ports: c.Ports.map(p => `${p.PrivatePort}->${p.PublicPort}`).join(', ')
            }));

            return {
                content: [{
                    type: "text",
                    text: JSON.stringify(formatted, null, 2)
                }]
            };
        } catch (error) {
            return {
                content: [{
                    type: "text",
                    text: `Error listing containers: ${error.message}`
                }],
                isError: true
            };
        }
    }
);

// Start the server using stdio transport
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Magnus Docker MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
