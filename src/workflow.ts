
import { attribute as _, Digraph, Subgraph, Node, Edge, toDot } from 'ts-graphviz';

const availableColorsForLabels = ["greenyellow", "cyan", "coral", "navy"];

class Order {
    static labelsColorMap: Map<string, string> = new Map();

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
            let labelsLabelAndColor = this.parseEmfLabels();
            console.log("Parsed mode label and color: ");
            console.log(labelsLabelAndColor);
            let hasLabels = labelsLabelAndColor[0];
            let label = labelsLabelAndColor[1];
            let color = labelsLabelAndColor[2];
            if (hasLabels) {
                this.node = new Node(this.orderId, {
                    [_.shape]: 'box',
                    [_.label]: label,
                    [_.fillcolor]: color,
                    [_.style]: "filled",
    
                });
            } else {
                this.node = new Node(this.orderId, {
                    [_.shape]: 'box',
                    [_.label]: this.orderId
    
                });
            }

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
    parseEmfLabels(): [boolean, string, string] {
        let hasLabels = false;
        let label = this.orderId;
        let fillcolor = "white";

        let labels: string = this.parameters.labels;
        console.log("parameters: " + this.parameters.labels);
        if (labels !== undefined) {
            hasLabels = true;
            let labelString = JSON.stringify(labels).replace(/"/g, '');
            label = label + " " + labelString;
            fillcolor = Order.pickColorForLabels(labelString);
        }
        return [hasLabels, label, fillcolor];
    }


    static pickColorForLabels(labels: string): string {
        console.log("Picking color for " + labels);
        // First see if already picked a color
        if (Order.labelsColorMap.has(labels)) {
            return Order.labelsColorMap.get(labels) ?? "yellow";
        }
        let alreadyPickedColorByOthers = new Set(Order.labelsColorMap.values());
        console.log(`Colors already picked by others that is not '${labels}':`);
        console.log(alreadyPickedColorByOthers);
        for (let c of availableColorsForLabels) {
            console.log(`Test if ${c} is already used ...`);
            if (!alreadyPickedColorByOthers.has(c)) {
                console.log(`Not used. Picked color ${c} for ${labels}`);
                Order.labelsColorMap.set(labels, c);
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