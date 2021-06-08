import { Dgraph } from "./easy-dgraph";
import { EnumType } from "./jsonToGraphQLQuery";

describe('Query Tests', () => {

    // GET
    it('Empty Query', () => {
        const d = new Dgraph('lesson').get({}).build();
        expect(d).toBe(`query { getLesson }`);
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

    it('Get Query with Several Fields in Filter', () => {
        const d = new Dgraph('lesson').get({
            me: 1
        }).filter({ post: '2223a', help: 'a-lot' }).build();
        expect(d).toBe(`query { getLesson(post: "2223a", help: "a-lot") { me } }`);
    });

    // AGGREGATE
    it('Get Query with Several Fields in Filter', () => {
        const d = new Dgraph('lesson').aggregate({
            name: 1,
            postsAggregate: {
                scoreMin: 1,
                scoreMax: 1,
                scoreAvg: 1
            }
        }).filter({
            score: {
                gt: 10
            }
        }).build();
        expect(d).toBe(`query { aggregateLesson(filter: { score: { gt: 10 } }) { name postsAggregate { scoreMin scoreMax scoreAvg } } }`);
    });


    // QUERY
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

    it('Cascade Pagination with Fields Array', () => {
        const d = new Dgraph('task').query({
            tom: 1
        }).cascade(['name', 'me']).first(5).offset(2).build();
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
                __cascade: ["tom", "bill"],
                name: 1,
                gun: 1
            }
        }).first(5).offset(2).build();
        expect(d).toBe(`query { queryTask(first: 5, offset: 2) { tom @cascade(fields: ["tom", "bill"]) { name gun } } }`);
    });

    it('Nested Cascade Pagination with Fields', () => {
        const d = new Dgraph('task').query({
            tom: {
                __cascade: "tom",
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

    it('Regular Expression Query', () => {
        const d = new Dgraph('task').query({
            tom: 1
        }).filter({ name: { regexp: "/.*iggy.*/" } }).first(5).offset(2).build();
        expect(d).toBe(`query { queryTask(first: 5, offset: 2, filter: { name: { regexp: "/.*iggy.*/" } }) { tom } }`);
    });

    it('Nested Numbers', () => {
        const d = new Dgraph('task').query({
            name: 1
        }).filter({
            location: {
                near: {
                    coordinate: {
                        latitute: 37.771935,
                        longitude: -122.469829
                    },
                    distance: 1000
                }
            }
        }).build();
        expect(d).toBe(`query { queryTask(filter: { location: { near: { coordinate: { latitute: 37.771935, longitude: -122.469829 }, distance: 1000 } } }) { name } }`);
    });

    it('Enum Type Query', () => {
        const d = new Dgraph('post').query({
            tom: 1
        }).filter({ tags: { eq: new EnumType('GraphQL') } }).build();
        expect(d).toBe(`query { queryPost(filter: { tags: { eq: GraphQL } }) { tom } }`);
    });

    it('Multiple Enum Type Query', () => {
        const d = new Dgraph('post').query({
            tom: 1
        }).filter({ tags: { eq: [new EnumType('GraphQL'), new EnumType('Dgraph')] } }).build();
        expect(d).toBe(`query { queryPost(filter: { tags: { eq: [GraphQL, Dgraph] } }) { tom } }`);
    });

    it('Boolean Types with Different Case Type', () => {
        const d = new Dgraph('pOSt').query({
            tom: 1,
            becca: 1
        }).filter({ sum: true, me: false }).build();
        expect(d).toBe(`query { queryPost(filter: { sum: true, me: false }) { tom becca } }`);
    });

    it('Query `has` Filter', () => {
        const d = new Dgraph('post').query({
            tom: 1
        }).filter({ has: 'name' }).build();
        expect(d).toBe(`query { queryPost(filter: { has: name }) { tom } }`);
    });

    it('Query `has` Multiple Filter', () => {
        const d = new Dgraph('post').query({
            tom: 1
        }).filter({ has: ['name', 'email'] }).build();
        expect(d).toBe(`query { queryPost(filter: { has: [name, email] }) { tom } }`);
    });

    it('Query `has` Multiple Nested Filter', () => {
        const d = new Dgraph('post').query({
            tom: 1,
            brandy: {
                __filter: {
                    has: ['name', 'email']
                }
            }
        }).build();
        expect(d).toBe(`query { queryPost { tom brandy(filter: { has: [name, email] }) } }`);
    });

});

describe('Mutation Tests', () => {

    // ADD
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

    // UPDATE
    it('Update Mutation Set', () => {
        const d = new Dgraph('lesson').update({
            me: 1,
            cards: {
                buddy: 1
            }
        }).filter({ bob: true }).set({ tim: false }).build();
        expect(d).toBe(`mutation { updateLesson(input: { filter: { bob: true }, set: { tim: false } }) { lesson { me cards { buddy } } numUids } }`);
    });

    it('Update Mutation Remove', () => {
        const d = new Dgraph('lesson').update({
            me: 1
        }).filter({ bob: true }).remove({ bob: false }).build();
        expect(d).toBe(`mutation { updateLesson(input: { filter: { bob: true }, remove: { bob: false } }) { lesson { me } numUids } }`);
    });

    // DELETE
    it('Delete Mutation', () => {
        const d = new Dgraph('lesson').delete({
            me: 1
        }).filter('222g').build();
        expect(d).toBe(`mutation { deleteLesson(filter: { id: "222g" }) { lesson { me } numUids msg } }`);
    });

});

describe('Custom Tests', () => {

    // Custom
    it('Custom Query', () => {
        const d = new Dgraph('getCustomTwitterUser').customQuery({
            location: 1,
            description: 1,
            count: 1
        }).filter({ name: '222g' }).build();
        expect(d).toBe(`query { getCustomTwitterUser(name: "222g") { location description count } }`);
    });

    it('Custom Mutation', () => {
        const d = new Dgraph('newCustomTwitterUser').customMutation().filter({ name: '222g', bug: 'spider' }).build();
        expect(d).toBe(`mutation { newCustomTwitterUser(name: "222g", bug: "spider") }`);
    });

});

describe('easy-dgraph Functions', () => {

    // Deep Mutations
    it('Update Deep Mutation', () => {
        const d = new Dgraph('lesson').deep({ field: 'cards', type: 'card' }).update({
            me: 1,
            cards: {
                tommy: 1
            }
        }).filter({ id: '12345' }).set({ me: false, cards: { tommy: 'son' } }).build();
        expect(d).toBe(`mutation { addCard(input: { tommy: "son" }, upsert: true) { numUids } updateLesson(input: { filter: { id: "12345" }, set: { me: false } }) { lesson { me cards { tommy } } numUids } }`);
    });

    it('Update 2 Deep Mutation', () => {
        const d = new Dgraph('lesson').deep([{ field: 'cards', type: 'card' }, { field: 'pods', type: 'pod' }]).update({
            me: 1,
            cards: {
                tommy: 1
            },
            pods: {
                free: 1
            }
        }).filter({ id: '12345' }).set({ me: false, cards: { tommy: 'son' }, pods: { f: 0 } }).build();
        expect(d).toBe(`mutation { addCard(input: { tommy: "son" }, upsert: true) { numUids } addPod(input: { f: 0 }, upsert: true) { numUids } updateLesson(input: { filter: { id: "12345" }, set: { me: false } }) { lesson { me cards { tommy } pods { free } } numUids } }`);
    });

});