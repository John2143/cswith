var clamp = function(x,a,b) {
	return Math.max(a, Math.min(x, b));
};
var lerp = function(a, b, t) {
	return a + clamp(t, 0, 1) * (b - a);
};
var Color = function(r, g, b) { //Color library
	if(g === undefined){
		this.bits = r;
		r -= (this.r = r >> 0x10) << 0x10;
		this.b = r - ((this.g = (r >> 0x8)) << 0x8);
	}else{
		this.r = r;
		this.g = g;
		this.b = b;
		this.bits = (r << 0x10) + (g << 0x8) + b;
	}
};
Color.prototype.toString = function(pre) {
	var str = Number(this.bits).toString(16).toUpperCase();
	return (pre ? pre === true ? '' :  pre : '#') + pad0(str, 6);
};
Color.prototype.RGB = function(a) {
	var isa = a !== undefined;
	return "rgb" + (isa ? "a" : "") + "(" + [this.r, this.g, this.b].join(", ") + (isa ? ", " + a : "") + ")";
};

pad0 = function(str, n) {
	return repeat('0', n-str.length) + str;
};
repeat = function(str, times) {
	return (new Array(times + 1)).join(str);
};
Color.lerp = function(a, b, t) {
	return new Color(
		Math.floor(lerp(a.r, b.r, t)),
		Math.floor(lerp(a.g, b.g, t)),
		Math.floor(lerp(a.b, b.b, t))
	);
};
Color.grey = Color.gray = function(pct) {return Color.lerp(new Color(0), new Color(0xffffff), pct);};

module.exports = {
	color: Color,
	lerp: lerp,
	clamp: clamp,
	pad0: pad0,
	repeat: repeat
};
