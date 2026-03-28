import {TodoList} from "./TodoList";
import {UserScope} from "./TodoScope";


export const TodoPage = () => <>
    <h1>Todo List</h1>
    <UserScope userId={"some-id"}>
        <TodoList/>
    </UserScope>
</>
