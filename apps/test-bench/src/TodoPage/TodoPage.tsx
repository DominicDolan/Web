import {TodoList} from "./TodoList";
import {UserScope} from "./TodoScope";


export const TodoPage = () => <>
    <h1>Todo List</h1>
    <UserScope userId={"some-id"}>
        <TodoList/>
    </UserScope>
    <button onClick={() => {
        fetch("/api/users", {
            method: "POST",
            body: JSON.stringify({
                id: "some-id",
                name: "some-name"
            })
        }).then(r => r.json()).then(r => console.log(r))
    }}>Post</button>
</>
