
export function PageNav() {

    return <nav class="flex gap-4 align-middle py-2 px-4 justify-between col-span-full w-full">
        <div class="h-full">
            <h1><i class="fa-solid fa-tv"></i>GuidePro</h1>
        </div>
        <ul class="chips flex gap-2 px-4">
            <li>
                <button class="active">All</button>
            </li>
            <li>
                <button>Movies</button>
            </li>
            <li>
                <button>Sports</button>
            </li>
            <li>
                <button>News</button>
            </li>
            <li>
                <button>Kids</button>
            </li>
        </ul>
    </nav>
}
