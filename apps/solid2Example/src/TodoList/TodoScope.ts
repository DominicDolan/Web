import {createScopeProvider, defineScope} from "@web/solid-scope";

export const UserScope = createScopeProvider<{userId: string}>()

export const useTodoScope  = defineScope(UserScope, (props) => {

    return {
        todos: ["test", "test2", "test3"]
    }
})
