export function isUserLogged(ctx) {
    return !!ctx.state.user;
}

export function loggedUserId(ctx) {
    return ctx.state.user.sub.id;
}

export function loggedUserEmail(ctx) {
    return ctx.state.user.sub.email;
}
