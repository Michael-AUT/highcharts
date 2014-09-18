/**
 * Highcharts Broken Axis plugin
 * 
 * Author: Torstein Honsi
 * License: MIT License
 *
 * Demo: http://jsfiddle.net/highcharts/Vf3yT/
 */

/*global HighchartsAdapter*/
(function (H) {	

	"use strict";

	var noop = function () {},
		floor = Math.floor,
		each = H.each,
		pick = H.pick,
		wrap = H.wrap,
		extend = H.extend,
 		fireEvent = HighchartsAdapter.fireEvent,
		Axis = H.Axis,
		Series = H.Series,
		noop = function () {};

	function stripArguments() {
		return Array.prototype.slice.call(arguments, 1);
	}

	extend(Axis.prototype, {
		isInBreak: function (brk, val) {
			var	repeat = brk.repeat || Infinity,
				val = val,
				from = brk.from,
				length = brk.to - brk.from,
				test = (val >= from ? (val - from) % repeat :  repeat - ((from - val) % repeat));

			if (!brk.inclusive) {
				return (test < length && test != 0);
			} else {
				return (test <= length);
			} 			
		},

		isInAnyBreak: function (val, testKeep) {
			// Sanity Check			
			if (!this.options.breaks) { return false; }

			var breaks = this.options.breaks,
				i = breaks.length,
				inbrk = false,
				keep = false;


			while (i--) {
				if (this.isInBreak(breaks[i], val)) {
					inbrk = true;
					if (!keep) {
						keep = pick(breaks[i].showPoints, this.isXAxis ? false : true);
					}
				}
			}

			if (inbrk && testKeep) {
				return inbrk && !keep;
			} else {
				return inbrk;
			}
		}
	});

	wrap(Axis.prototype, 'setTickPositions', function (proceed) {
		proceed.apply(this, Array.prototype.slice.call(arguments, 1));
		
		var axis = this,
			tickPositions = this.tickPositions,
			info = this.tickPositions.info,
			newPositions = [],
			i;

		for (i=0; i < tickPositions.length; i++) {
			if (!axis.isInAnyBreak(tickPositions[i])) {
				newPositions.push(tickPositions[i]);
			}
		}

		this.tickPositions = newPositions;
		this.tickPositions.info = info;
	});

	wrap(Axis.prototype, 'init', function (proceed, chart, userOptions) {

		proceed.call(this, chart, userOptions);

		if(this.options.breaks) {

			var axis = this;
			
			axis.postTranslate = true;

			this.val2lin = function (val) {
				var nval = val,
					brk,
					i;

				for(i = 0; i < axis.breakArray.length; i++) {
					brk = axis.breakArray[i];
					if (brk.to <= val) {
						nval -= (brk.len);
					} else if (brk.from >= val) {
						break;
					} else if (axis.isInBreak(brk, val)) {
						nval -= (val - brk.from);
						break;
					}
				}

				return nval;
			};
			
			this.lin2val = function (val) {				
				var nval = val,
					brk,
					i;

				for (i = 0; i < axis.breakArray.length; i++) {
					brk = axis.breakArray[i];
					if (brk.from >= nval) {
						break;
					} else if (brk.to < nval) {
						nval += (brk.to - brk.from);
					} else if (axis.isInBreak(brk, nval)) {
						nval += (brk.to - brk.from);
					} 
				}

				return nval;
			};

			this.setAxisTranslation = function (saveOld) {				
				Axis.prototype.setAxisTranslation.call(this, saveOld);

				var breaks = axis.options.breaks,
					breakArrayT = [],	// Temporary one
					breakArray = [],
					length = 0, 
					inBrk,
					repeat,
					brk,
					min = axis.userMin || axis.min,
					max = axis.userMax || axis.max,
					start,
					i,
					j;

				// Construct an array holding all breaks in the axis
				for (i in breaks) {
					brk = breaks[i];
					start = brk.from;
					repeat = brk.repeat || Infinity;

					while (start - repeat > min) {
						start -= repeat;
					}
					while (start < min) {
						start += repeat;
					}

					for (j = start; j < max; j += repeat) {
						breakArrayT.push({
							value: j,
							move: 'in',
						});
						breakArrayT.push({
							value: j + (brk.to - brk.from),
							move: 'out',
							size: brk.breakSize
						});
					}
				}

				breakArrayT.sort(function (a, b) {
					if (a.value == b.value) {
						return (a.move === 'in' ? 0 : 1) - (b.move === 'in' ? 0 : 1);
					} else {
						return a.value - b.value;
					}
				});
				
				// Simplify the breaks
				inBrk = 0;
				start = min;

				for (i in breakArrayT) {
					brk = breakArrayT[i];
					inBrk += (brk.move === 'in' ? 1 : -1);

					if (inBrk === 1 && brk.move === 'in') {
						start = brk.value;
					} 
					if (inBrk === 0) {
						breakArray.push({
							from: start,
							to: brk.value,
							len: brk.value - start - (brk.size || 0)
						});
						length += brk.value - start - (brk.size || 0);					
					}
				}

				axis.breakArray = breakArray;

				fireEvent(axis, 'afterBreaks');

				axis.transA *= (max - min) / (max - min - length);

			};
		}
	});

	wrap(Series.prototype, 'generatePoints', function (proceed) {		

		var series = this,
			data = series.preBreakData || series.options.data,
			ndata = [],
			//points = series.oldPoints || series.points,
			//npoints = [],
			xAxis = series.xAxis,
			yAxis = series.yAxis,
			i = 0,
			point,
			x,
			y;

		if (xAxis.options.breaks || yAxis.options.breaks) {
			// Register old data && points
			series.preBreakData = data.slice();

			// Create a filtered points Array
			while (i < data.length) {
				point = data[i];

				x = point.x ? point.x : (i * (series.options.pointInterval || 1)) + (series.options.pointStart || 0);
				y = point.y ? point.y : point;

				if(!(xAxis.isInAnyBreak(x, true) || yAxis.isInAnyBreak(y, true))) {
					if (point.x) {
						ndata.push(point);
					} else {
						ndata.push({
							x: x,
							y: y
						});
					}
					//ndata.push(point);
				} else {
					//npoints.push(null);
				}
				
				i++;
			}

			// Register new points
			series.options.data = ndata;
		}

		proceed.apply(this, stripArguments(arguments));
	});


}(Highcharts));
