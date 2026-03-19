import {createMemo, createSignal, For, Loading, Repeat} from "solid-js";
import {queries} from "../api/queries";
import dayjs from "dayjs";

const HOUR_WIDTH = 300;

function ProgramRow(props: { event: TvHeadendEvent }) {

    const start = () => new Date(props.event.start*1000)
    const stop = () => new Date(props.event.stop*1000)

    const timeString = createMemo(() => {
        const startText = dayjs(start()).format('h:mm A')
        const stopText = dayjs(stop()).format('h:mm A')

        return `${startText} - ${stopText}`

    })

    const duration = () => {
        return dayjs.duration(dayjs(stop()).diff(start())).asHours()
    }

    const width = () => {
        return duration() * HOUR_WIDTH;
    }

    const isActive = createMemo(() => {
        return dayjs().isBetween(start(), stop())
    })

    return <div class="relative" style={`width: ${width()}px; min-width: ${width()}px;`}>
        <div class={`card ${isActive() ? 'active' : ''} absolute inset-1`}>
            <div class="program-title">{props.event.title}</div>
            <div class="program-time">{timeString()}</div>
        </div>
    </div>
}

export function ProgrammeGuide() {

    // Constants for UI generation
    const HOUR_WIDTH = 300; // pixels per hour
    const startHour = dayjs().startOf("hour");  // Starting at 6:00 PM
    const HOURS_TO_SHOW = 6;

    const channelsList = createMemo(() => queries.channels.list().then(r => r?.entries ?? []))

    const epgList = createMemo(() => queries.epg.events().then(r => r?.entries ?? []))

    function programByChannel(channelId: string) {
        return epgList().filter(p => p.channelUuid === channelId);
    }

    // 3. Sync vertical scrolling between main grid and sidebar
    const epgMain = document.getElementById('epgMain');
    const [sidebarList, setSidebarList] = createSignal<HTMLDivElement>()

    function onScroll(e: any) {
        console.log("scrolling")
        const sidebar = sidebarList()
        if (sidebar != null) {
            sidebar.scrollTop = e.target.scrollTop
        }
    }

    return <>
        <Loading fallback={<div>Loading...</div>}>
            <aside class="w-full h-full flex flex-col">
                <div class="row h-16 flex items-center justify-center">
                    <h2>Channels</h2>
                </div>
                <div class="flex-1 overflow-y-auto" ref={setSidebarList}>
                    <div>
                        <For each={channelsList()}>{(channel) => (<>
                            <div class="row h-24 flex flex-col gap-2 items-center justify-center px-2">
                                <div><i class={`fa-solid fa-earth-europe`}></i></div>
                                <div>{channel().val}</div>
                            </div>
                        </>)}</For>
                    </div>

                </div>
            </aside>

            <main class="w-full h-full flex flex-col">
                <div class="row flex gap-2 h-16">
                    <Repeat count={HOURS_TO_SHOW}>{(i) => {
                        const currentHour = startHour.clone().add(i, "hour");
                        return <>
                            <div style={`width: ${HOUR_WIDTH/2}px`}>{currentHour.format("HH:mm")}</div>
                            <div style={`width: ${HOUR_WIDTH/2}px`}>{currentHour.add(30, "minute").format("HH:mm")}</div>
                        </>
                    }}</Repeat>
                </div>

                <div class={"flex-1 overflow-y-auto"} onScroll={onScroll} >
                    <div>
                        <For each={channelsList()}>{(channel) => (<>
                                <div class="row h-24 flex gap-2">
                                    <For each={programByChannel(channel().key)}>{(program) => (<>
                                        <ProgramRow event={program()} />
                                    </>)}</For>
                                </div>
                            </>)}</For>
                    </div>
                </div>
            </main>
        </Loading>
</>
}
