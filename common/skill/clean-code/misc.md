# Clean Code: Misc

## Rule 1: Let the TypeScript compiler pay its rent

Don't add types for everything. If it can be inferred, just let it be inferred (except in rare cases where it's an actual performance concern). 

Do spend time on making sure functions are typed with well thought out generics so that inference at the call site is effortless.

Types that represent contracts should be in their own module/folder. Consider if the contract should in fact be a schema in which case use zod/valibot/arktype.
