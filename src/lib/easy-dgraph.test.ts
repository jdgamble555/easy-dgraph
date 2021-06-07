import { Dgraph } from "./easy-dgraph";


describe('Query Test', () => {
    // use test() or it()
    // it.todo()
    // empty object = .toEqual()
    //
    //beforeEach(() => { d = new Dgraph(); });

    it('Empty Query', () => {
        const d = new Dgraph('lesson').query({}).build();
        expect(d).toBe(`query { queryLesson }`);
    });

    it('Get Query', () => {
        const d = new Dgraph('lesson').get({
            me: 1
        }).build();
        expect(d).toBe(`query { getLesson { me } }`);
    });

    it('Get Query with Filter', () => {
        const d = new Dgraph('lesson').get({
            me: 1
        }).filter('2223a').build();
        expect(d).toBe(`query { getLesson(id: "2223a") { me } }`);
    });

    it('Get Query with New Id Field with Filter', () => {
        const d = new Dgraph('lesson').get({
            me: 1
        }).idField('post').filter('2223a').build();
        expect(d).toBe(`query { getLesson(post: "2223a") { me } }`);
    });

    it('Get Query with New Id Field in Filter', () => {
        const d = new Dgraph('lesson').get({
            me: 1
        }).filter({ post: '2223a' }).build();
        expect(d).toBe(`query { getLesson(post: "2223a") { me } }`);
    });

    it('Get Query with Order Filter', () => {
        const d = new Dgraph('lesson').query({
            me: 1
        }).order({ asc: 'bob', then: { desc: 'jill' } }).filter({ post: '2223a' }).build();
        expect(d).toBe(`query { queryLesson(order: { asc: bob, then: { desc: jill } }, filter: { post: "2223a" }) { me } }`);
    });

    it('Get Query with Complex Filter', () => {
        const d = new Dgraph('lesson').query({
            me: 1
        }).filter({
            or: [
                { and: [{ title: { allofterms: "GraphQL" } }, { not: { tags: { eq: "GraphQL" } } }] },
                { and: [{ title: { allofterms: "Dgraph" } }, { not: { tags: { eq: "Dgraph" } } }] }
            ]
        }).build();
        expect(d).toBe(`query { queryLesson(filter: { or: [{ and: [{ title: { allofterms: "GraphQL" } }, { not: { tags: { eq: "GraphQL" } } }] }, { and: [{ title: { allofterms: "Dgraph" } }, { not: { tags: { eq: "Dgraph" } } }] }] }) { me } }`);
    });

    it('Multiple Queries', () => {
        const d = new Dgraph('lesson').query({
            me: 1
        }).type('lesson', 'bob').query({
            you: 1,
            him: 1
        }).build();
        expect(d).toBe(`query { queryLesson { me } bob: queryLesson { you him } }`);
    });

    it('Multiple Queries Subscription', () => {
        const d = new Dgraph('lesson').query({
            me: 1
        }).type('lesson', 'bob').query({
            you: 1,
            him: 1
        }).buildSubscription();
        expect(d).toBe(`subscription { queryLesson { me } bob: queryLesson { you him } }`);
    });

    it('Add Mutation', () => {
        const d = new Dgraph('lesson').add({
            me: 1
        }).build();
        expect(d).toBe(`mutation { addLesson { lesson { me } numUids } }`);
    });

    it('Add Mutation with Set', () => {
        const d = new Dgraph('lesson').add({
            me: 1
        }).set({ bob: true }).build();
        expect(d).toBe(`mutation { addLesson(input: { bob: true }) { lesson { me } numUids } }`);
    });

    it('Add Mutation with Set', () => {
        const d = new Dgraph('lesson').upsert({
            me: 1
        }).set({ bob: true }).build();
        expect(d).toBe(`mutation { addLesson(input: { bob: true }, upsert: true) { lesson { me } numUids } }`);
    });

    it('Update Mutation Set', () => {
        const d = new Dgraph('lesson').update({
            me: 1
        }).filter({ bob: true }).set({ tim: false }).build();
        expect(d).toBe(`mutation { updateLesson(input: { filter: { bob: true }, set: { tim: false } }) { lesson { me } numUids } }`);
    });

    it('Update Mutation Remove', () => {
        const d = new Dgraph('lesson').update({
            me: 1
        }).filter({ bob: true }).remove({ bob: false }).build();
        expect(d).toBe(`mutation { updateLesson(input: { filter: { bob: true }, remove: { bob: false } }) { lesson { me } numUids } }`);
    });

    it('Delete Mutation', () => {
        const d = new Dgraph('lesson').delete({
            me: 1
        }).filter('222g').build();
        expect(d).toBe(`mutation { deleteLesson(filter: { id: "222g" }) { lesson { me } numUids msg } }`);
    });

    it('Cascade Pagination', () => {
        const d = new Dgraph('task').query({
            me: 1
        }).cascade().first(5).offset(2).build();
        expect(d).toBe(`query { queryTask(first: 5, offset: 2) @cascade { me } }`);
    });

    it('Cascade Pagination with Fields', () => {
        const d = new Dgraph('task').query({
            tom: 1
        }).cascade('name', 'me').first(5).offset(2).build();
        expect(d).toBe(`query { queryTask(first: 5, offset: 2) @cascade(fields: ["name", "me"]) { tom } }`);
    });

    it('Nested Cascade Pagination', () => {
        const d = new Dgraph('task').query({
            tom: {
                __cascade: 1,
                name: 1,
                gun: 1
            }
        }).first(5).offset(2).build();
        expect(d).toBe(`query { queryTask(first: 5, offset: 2) { tom @cascade { name gun } } }`);
    });

    it('Nested Cascade Pagination with Fields', () => {
        const d = new Dgraph('task').query({
            tom: {
                __cascade: ["tom"],
                name: 1,
                gun: 1
            }
        }).first(5).offset(2).build();
        expect(d).toBe(`query { queryTask(first: 5, offset: 2) { tom @cascade(fields: ["tom"]) { name gun } } }`);
    });

    it('Nested Filter', () => {
        const d = new Dgraph('task').query({
            tom: {
                __filter: {
                    title: {
                        allofterms: "GraphQL"
                    }
                },
                name: 1,
                gun: 1
            }
        }).first(5).offset(2).build();
        expect(d).toBe(`query { queryTask(first: 5, offset: 2) { tom(filter: { title: { allofterms: "GraphQL" } }) { name gun } } }`);
    });

});