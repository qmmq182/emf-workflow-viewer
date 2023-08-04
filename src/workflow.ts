
import { attribute as _, Digraph, Subgraph, Node, Edge, toDot } from 'ts-graphviz';

const availableColorsForExecMode = ["greenyellow", "cyan", "coral", "navy"];

class Order {
    static execModeColorMap: Map<string, string> = new Map();

    orderId: string;
    parentIdList: string[];
    node: Node | undefined;
    nonExistentParentIdList: string[] = [];
    parameters;
    

    constructor(orderId: string, parentIdList=[], parameters="{}") {
        this.orderId = orderId;
        this.parentIdList = parentIdList;
        this.parameters = JSON.parse(parameters);
    }


    getNode() {
        if (this.node === undefined) {
            let execModeLabelAndColor = this.parseExecutionMode();
            console.log("Parsed mode label and color: ");
            console.log(execModeLabelAndColor);
            let label = execModeLabelAndColor[0];
            let color = execModeLabelAndColor[1];
            this.node = new Node(this.orderId, {
                [_.shape]: 'box',
                [_.label]: label,
                [_.color]: color

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

    /**
     * @returns A tuple that contains LABEL and COLOR
     */
    parseExecutionMode(): [string, string] {
        let label = this.orderId;
        let color = "black";
        let execMode: string = this.parameters.labels?.execution_mode?.join(",");
        console.log("parameters: " + this.parameters.labels);
        if (execMode !== undefined) {
            label = label + " (exec_mode: " +  execMode + ")";
            color = Order.pickColorForExecMode(execMode);
        }
        return [label, color];
    }


    static pickColorForExecMode(execMode: string): string {
        console.log("Picking color for " + execMode);
        // First see if already picked a color
        if (Order.execModeColorMap.has(execMode)) {
            return Order.execModeColorMap.get(execMode) ?? "yellow";
        }
        let alreadyPickedColorByOthers = new Set(Order.execModeColorMap.values());
        console.log(`Colors already picked by others that is not '${execMode}':`);
        console.log(alreadyPickedColorByOthers);
        for (let c of availableColorsForExecMode) {
            console.log(`Test if ${c} is already used ...`);
            if (!alreadyPickedColorByOthers.has(c)) {
                console.log(`Not used. Picked color ${c} for ${execMode}`);
                Order.execModeColorMap.set(execMode, c);
                return c;

            }
        }
        return "yellow";

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
        let paramString = jsonLine.parameters ?? "{}";
        let order = new Order(orderId, jsonLine.parents, paramString);
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