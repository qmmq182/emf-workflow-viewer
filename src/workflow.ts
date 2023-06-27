
import { attribute as _, Digraph, Subgraph, Node, Edge, toDot } from 'ts-graphviz';

class Order {

    orderId: string;
    parentIdList: string[];
    node: Node | undefined;
    nonExistentParentIdList: string[] = [];

    constructor(orderId: string, parentIdList=[]) {
        this.orderId = orderId;
        this.parentIdList = parentIdList;
    }

    getNode() {
        if (this.node === undefined) {
            this.node = new Node(this.orderId, {
                [_.shape]: 'box'
            });
        }
        return this.node;
    }

    getEdges(orderId2OrderMap: Map<string, Order>) {
        let edges: Edge[] = [];
        for (let parentOrderId of this.parentIdList) {
            let aParentOrder: Order | undefined = orderId2OrderMap.get(parentOrderId);
            if (aParentOrder) {
                edges.push(
                    new Edge([aParentOrder.getNode(), this.getNode()], {})
                );
            } else {
                // Sometimes we have typo that the order_id in "parents" patermeter does not exist
                this.nonExistentParentIdList.push(parentOrderId);
            }
        }
        return edges;
    }
    
}

class NonExistentOrder extends Order {
    
    constructor(orderId: string, parentIdList=[]) {
        super(orderId, parentIdList);
        this.orderId = orderId + " (does not exist)";
    }

    getNode() {
        if (this.node === undefined) {
            this.node = new Node(this.orderId, {
                [_.shape]: 'box',
                [_.color]: 'red'
            });
        }
        return this.node;
    }
}


export function convertEmfWorkflowToDot(text: string) {

    const orderId2OrderMap = new Map<string, Order>();
    const orders: Order[] = [];

    const G = new Digraph();

    let lines = text.trim().split("\n");
    for (let line of lines) {
        // console.log(line);
        if (line.trim() === "") {
            continue;
        };
        let jsonLine = JSON.parse(line);
        let orderId = jsonLine.order_id;
        console.log(orderId);
        let order = new Order(orderId, jsonLine.parents);
        orders.push(order);
        orderId2OrderMap.set(orderId, order);

    }

    for (let order of orders) {
        G.addNode(order.getNode());
        for (let edge of order.getEdges(orderId2OrderMap)) {
            G.addEdge(edge);
        }
        
    }

    // Deal with non-existent order_id in parents parameter:
    for (let order of orders) {
        for (let nonExistentParentOrderId of order.nonExistentParentIdList) {
            let nonExistentParentOrder = new NonExistentOrder(nonExistentParentOrderId);
            G.addNode(nonExistentParentOrder.getNode());
            let nonExistentEdge = new Edge([nonExistentParentOrder.getNode(), order.getNode()], {});
            G.addEdge(nonExistentEdge);
        }
    }

    const dot = toDot(G);
    return dot;

}