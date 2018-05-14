
function lruNode(key, val) {
    this.key = key
    this.val = val
    this.next = null;
    this.prev = null;
}

function lruCache() {
    this.max = 100;
    this.size = 0;
    this.map = {};
    this.head = null;
    this.tail = null;
}

lruCache.prototype.get = function(key) {
    if (this.map[key]) {
        var val = this.map[key].val;
        this.remove(key);
        this.push(new lruNode(key, val));
        return val;
    }
}

lruCache.prototype.push = function(node) {
    node.next = this.head;
    if (this.head) {
        this.head.prev = node;
    }
    if (!this.tail) {
        this.tail = node;
    }

    this.head = node;
    this.size++;
    this.map[node.key] = node;
}

lruCache.prototype.put = function(key, val) {
    if (key in this.map) {
        this.map[key].val = val;
        this.remove(key);
    }
    else {
        if (this.size >= this.max && this.size > 0) {
            delete this.map[this.tail.key];
            this.tail = this.tail.prev;
            this.tail.next = null;
            this.size--;
        }
    }

    this.push(new lruNode(key, val));
}

lruCache.prototype.remove = function(key) {
    var node = this.map[key];
    if (node.prev) {
        node.prev.next = node.next;
    }
    else {
        this.head = node.next;
    }
    if (node.next) {
        node.next.prev = node.prev;
    }
    else {
        this.tail = node.prev;
    }

    delete this.map[key];
    this.size--;
}

lruCache.prototype.test = function() {
    l = new lruCache();
    l.put(3, 5);
    l.put(4, 6);
    l.put(3, 6);
    l.put(1, 2);
    l.put(2, 3);
    l.get(3);
    l.get(1);
}
