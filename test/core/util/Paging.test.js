import { pagingFromContext } from "../../../src/core/utils/Paging";

let ctx;

beforeEach(() => {
    ctx = { request: { path: "/donor", querystring: "a=1" }, query: {} };
});

describe("paging", () => {
    test("should be possible to create from context - page 1", () => {
        Object.assign(ctx.query, { page: 1 });
        const paging = pagingFromContext(ctx, 10, 100);
        expect(paging.offset).toBe(0);
        expect(paging.limit).toBe(10);
        expect(paging.totalCount).toBe(100);
        expect(paging.hasPrevious).toBe(false);
        expect(paging.hasNext).toBe(true);
        expect(paging.next).toBe("/donor?a=1&page=2");
        expect(paging.pagesWithDirectLink.length).toBe(4);
    });

    test("should be possible to create from context - page 4", () => {
        Object.assign(ctx.query, { page: 4 });
        const paging = pagingFromContext(ctx, 10, 100);
        expect(paging.offset).toBe(30);
        expect(paging.limit).toBe(10);
        expect(paging.totalCount).toBe(100);
        expect(paging.hasPrevious).toBe(true);
        expect(paging.previous).toBe("/donor?a=1&page=3");
        expect(paging.hasNext).toBe(true);
        expect(paging.next).toBe("/donor?a=1&page=5");
        expect(paging.pagesWithDirectLink.length).toBe(7);
    });

    test("should be possible to create from context - page 10", () => {
        Object.assign(ctx.query, { page: 10 });
        const paging = pagingFromContext(ctx, 10, 100);
        expect(paging.offset).toBe(90);
        expect(paging.limit).toBe(10);
        expect(paging.totalCount).toBe(100);
        expect(paging.hasPrevious).toBe(true);
        expect(paging.previous).toBe("/donor?a=1&page=9");
        expect(paging.hasNext).toBe(false);
        expect(paging.pagesWithDirectLink.length).toBe(4);
    });

    test("should be possible to create from context - page not defined", () => {
        const paging = pagingFromContext(ctx, 10, 100);
        expect(paging.offset).toBe(0);
        expect(paging.limit).toBe(10);
        expect(paging.totalCount).toBe(100);
    });
});
