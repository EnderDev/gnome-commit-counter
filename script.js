import { config } from "dotenv";
import { Octokit } from "@octokit/core";
import parse from "parse-link-header";

config();

const gh = new Octokit({ auth: process.env.TOKEN });

async function requestEvents() {
    let events = [];
    let i = 0;
    let maxPages = Infinity;

    while (i < maxPages) {
        i++;

        try {
            const evs = await gh.request("GET /users/{username}/events", { username: process.env.GH_USERNAME, per_page: 100, page: i });

            if (maxPages == Infinity) {
                maxPages = parse(evs.headers.link).last.page;
            }

            events = events.concat(evs.data);
        } catch (e) {
            throw e;
        }
    }

    const totalCommits90d = events
        .filter(ev => ev.type == "PushEvent")
        .flatMap(e => e.payload.commits.map(c => ({ 
            ...c, 
            created_at: e.created_at 
        })))
        .filter(c => c.author.name == process.env.GH_USERNAME);

    const oneDay = 24 * 60 * 60 * 1000;

    const totalCommits30d = totalCommits90d
        .filter(c => Math.round(Math.abs((new Date(c.created_at) - new Date()) / (oneDay))) <= 30)

    const totalCommits7d = totalCommits90d
        .filter(c => Math.round(Math.abs((new Date(c.created_at) - new Date()) / (oneDay))) <= 7)

    const totalCommits1d = totalCommits90d
        .filter(c => Math.round(Math.abs((new Date(c.created_at) - new Date()) / (oneDay))) <= 1)

    console.log(`30d: ${totalCommits30d.length}   7d: ${totalCommits7d.length}   1d: ${totalCommits1d.length}`)
}

async function main() {
    await requestEvents();
}

main();