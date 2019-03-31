"use strict";

import { parse, stringify } from "querystring";

export class Paging {
    constructor(path, queryString, offset, limit, totalCount) {
        this.path = path;
        this.queryParams = parse(queryString);
        this.offset = Math.max(offset ? offset : 0, 0);
        this.limit = limit ? limit : 10;
        this.totalCount = totalCount;
        this.activePage = this.offset === 0 ? 1 : this.offset / limit + 1;
        this.maxPage =
            this.totalCount === 0 ? 1 : Math.ceil(this.totalCount / limit);
    }

    get hasPrevious() {
        return this.activePage > 1;
    }

    get previous() {
        return this.buildLink(this.activePage - 1);
    }

    get hasNext() {
        return this.activePage < this.maxPage;
    }

    get next() {
        return this.buildLink(this.activePage + 1);
    }

    get pagesWithDirectLink() {
        const min = Math.max(this.activePage - 3, 1);
        const max = Math.min(this.activePage + 3, this.maxPage);
        const result = [];
        let i;
        for (i = min; i <= max; i++) {
            result.push({ number: i, link: this.buildLink(i) });
        }
        return result;
    }

    buildLink(page) {
        return `${this.path}?${this.buildQueryString(page)}`;
    }

    buildQueryString(page) {
        return stringify(Object.assign({}, this.queryParams, { page }));
    }
}

export function pagingFromContext(ctx, pageCount, totalCount) {
    let page;
    try {
        page = Math.max(ctx.query.page ? Number(ctx.query.page) : 1, 1);
    } catch (e) {
        ctx.throw(400);
    }
    return new Paging(
        ctx.request.path,
        ctx.request.querystring,
        (page - 1) * pageCount,
        pageCount,
        totalCount
    );
}
