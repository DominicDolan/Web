import {createMemo, For, Loading, Repeat} from "solid-js";
import {queries} from "../api/queries";

const showNames = ["Morning News", "The Big Match", "Blockbuster Movie", "Wild Safari", "Tech Today", "Late Night Show", "Sitcom Rerun", "Investigative Report", "Kids Cartoon Hour", "Music Top 40", "Cooking Masterclass", "Sci-Fi Epic"];

const HOUR_WIDTH = 300;
const START_HOUR = 18;

// Helper to format time
const formatTime = (hour: number, min: number) => {
    return `${hour.toString().padStart(2, '0')}:${min === 0 ? '00' : '30'}`;
};

function ProgramRow(props: { start: number, duration: number, width: number }) {


    // Calculate Start and End times for text
    const startH = START_HOUR + Math.floor(props.start / 60);
    const startM = props.start % 60;
    const endH = START_HOUR + Math.floor((props.start + props.duration) / 60);
    const endM = (props.start + props.duration) % 60;

    const timeString = `${formatTime(startH, startM)} - ${formatTime(endH, endM)}`;
    const randomShow = showNames[Math.floor(Math.random() * showNames.length)];

    return <div class="program-card" style={`width: ${props.width}px; min-width: ${props.width}px;`}>
        <div class="program-title">{randomShow}</div>
        <div class="program-time">{timeString}</div>
    </div>
}

export function Example() {

    // Constants for UI generation
    const HOUR_WIDTH = 300; // pixels per hour
    const START_HOUR = 18;  // Starting at 6:00 PM
    const HOURS_TO_SHOW = 6;



    // Mock Channels
    const channels = [
        {id: 1, name: 'BBC One', icon: 'fa-earth-europe' },
        { id: 2, name: 'Sky Sports', icon: 'fa-futbol' },
        { id: 3, name: 'HBO Max', icon: 'fa-film' },
        { id: 4, name: 'CNN News', icon: 'fa-newspaper' },
        { id: 5, name: 'Discovery', icon: 'fa-leaf' },
        { id: 6, name: 'Nat Geo', icon: 'fa-camera' },
        { id: 7, name: 'Cartoon Net', icon: 'fa-child-reaching' },
        { id: 8, name: 'MTV', icon: 'fa-music' },
        { id: 9, name: 'Comedy Cent', icon: 'fa-masks-theater' },
        { id: 10, name: 'Sci-Fi', icon: 'fa-rocket' }
    ];

    const serverInfo = createMemo(() => queries.server.info())

    const channelsList = createMemo(() => queries.channels.list())


    const programTimes: Array<{channelId: number, start: number, duration: number, width: number, text: string, show: string}> = []
    channels.forEach(channel => {
        let currentMinute = 0;
        const totalMinutes = HOURS_TO_SHOW * 60;


        // Fill the row with random-length programs
        while (currentMinute < totalMinutes) {
            // Random duration: 30, 60, 90, or 120 minutes
            const durations = [30, 60, 90, 120];
            let duration = durations[Math.floor(Math.random() * durations.length)];

            // Cap duration to not exceed the timeline
            if (currentMinute + duration > totalMinutes) {
                duration = totalMinutes - currentMinute;
            }

            // Calculate width in pixels (300px = 60 mins -> 5px per min)
            const widthPx = duration * 5;

            // Calculate Start and End times for text
            const startH = START_HOUR + Math.floor(currentMinute / 60);
            const startM = currentMinute % 60;
            const endH = START_HOUR + Math.floor((currentMinute + duration) / 60);
            const endM = (currentMinute + duration) % 60;

            const timeString = `${formatTime(startH, startM)} - ${formatTime(endH, endM)}`;
            const randomShow = showNames[Math.floor(Math.random() * showNames.length)];

            programTimes.push({channelId: channel.id, start: currentMinute, duration, width: widthPx, text: timeString, show: randomShow});

            currentMinute += duration;
        }

        return programTimes
    });

    function programByChannel(channelId: number) {
        return programTimes.filter(p => p.channelId === channelId);
    }

    // 3. Sync vertical scrolling between main grid and sidebar
    const epgMain = document.getElementById('epgMain');
    const sidebarList = document.getElementById('channelList');

    // epgMain.addEventListener('scroll', () => {
    //     sidebarList.scrollTop = epgMain.scrollTop;
    // });

    return <>
        <nav class="navbar">
            <div class="navbar-brand">
                <i class="fa-solid fa-tv"></i> GuidePro
            </div>
            <Loading fallback={<div>Loading...</div>}>
                <div>{JSON.stringify(serverInfo())}</div>
            </Loading>
            <div class="navbar-filters">
                <button class="active">All</button>
                <button>Movies</button>
                <button>Sports</button>
                <button>News</button>
                <button>Kids</button>
            </div>
        </nav>

        <div class="epg-wrapper">

            <aside class="epg-sidebar">
                <div class="sidebar-header">Channels</div>
                <div class="channel-list" id="channelList">
                    <For each={channels}>{(channel) => (<>
                        <div class="channel-item">
                            <div class="channel-logo"><i class={`fa-solid ${channel().icon}`}></i></div>
                            <div class="channel-name">{channel().name}</div>
                        </div>
                    </>)}</For>
                </div>
            </aside>

            <main class="epg-main" id="epgMain">
                <div class="current-time-line" style="left: 350px;"></div>
                <Loading fallback={<div>Loading...</div>}>
                    <div>Channel list{JSON.stringify(channelsList())}</div>
                </Loading>

                <div class="timeline-header">
                    <Repeat count={HOURS_TO_SHOW}>{(i) => {
                        const currentHour = START_HOUR + i;
                        return <>
                            <div class="time-slot">{formatTime(currentHour, 0)}</div>
                            <div class="time-slot">{formatTime(currentHour, 30)}</div>
                        </>
                    }}</Repeat>
                </div>

                <div class="programs-grid" id="programsGrid">
                    <For each={channels}>{(channel) => (<>
                            <div class="program-row">
                                <For each={programByChannel(channel().id)}>{(program) => (<>
                                    <ProgramRow start={program().start} duration={program().duration} width={program().width} />
                                </>)}</For>
                            </div>
                        </>)}</For>
                </div>
            </main>
        </div>
</>
}
