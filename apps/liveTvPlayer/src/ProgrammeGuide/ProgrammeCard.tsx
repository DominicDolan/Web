import {createMemo, Show} from "solid-js";
import dayjs from "dayjs";
import {HOUR_WIDTH} from "./ProgrammeGuide";

export function ProgrammeCard(props: { event: TvHeadendEvent, startHour: dayjs.Dayjs }) {

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

    const isPast = createMemo(() => {
        return dayjs().isAfter(stop())
    })

    const isFuture = createMemo(() => {
        return dayjs().isBefore(start())
    })

    const cardVariant = createMemo(() => {
        if (isPast()) {
            return "flat"
        } else if (isFuture()) {
            return "elevated"
        } else {
            return "tertiary active"
        }
    })

    const percentComplete = createMemo(() => {
        return (dayjs.duration(dayjs().diff(start())).asHours() / duration()) * 100
    })

    const pixelsFromStart = createMemo(() => {
        console.log("pixelsFromStart")
        return (dayjs.duration(dayjs(start()).diff(props.startHour)).asHours()) * HOUR_WIDTH
    })

    return <div class="absolute h-full" style={`width: ${width()}px; min-width: ${width()}px; left: ${pixelsFromStart()}px;`}>
        <article class={`${cardVariant()} absolute inset-1 p-4`}>
            <hgroup>
                <h3>{props.event.title}</h3>
                <p>{timeString()}</p>
            </hgroup>
            <Show when={!isPast() && !isFuture()}>
                <div class={"flex gap-2 items-center"}>
                    <ul class={"chips"}><li>Live</li></ul>
                    <progress-bar class={"linear grow h-1"}><div class={"h-full"} style={`width: ${percentComplete()}%`}></div></progress-bar>
                </div>
            </Show>
        </article>
    </div>
}
