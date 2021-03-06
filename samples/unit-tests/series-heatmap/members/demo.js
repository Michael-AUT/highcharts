QUnit.test('seriesTypes.heatmap.pointClass.setState', function (assert) {
    var series = Highcharts.seriesTypes.heatmap,
        setState = series.prototype.pointClass.prototype.setState,
        pointAttribs = series.prototype.pointAttribs,
        noop = Highcharts.noop,
        point = {
            graphic: {
                attr: function (obj) {
                    var graphic = this,
                        keys = Object.keys(obj);
                    keys.forEach(function (key) {
                        var value = obj[key];
                        graphic[key] = value;
                    });
                },
                addClass: noop,
                removeClass: noop
            },
            series: {
                type: 'heatmap',
                options: {
                    states: {
                        hover: {},
                        select: {}
                    }
                },
                pointAttribs: pointAttribs,
                zones: []
            },
            options: {}
        };
    setState.call(point, '');
    assert.strictEqual(
        point.graphic.zIndex,
        0,
        'When state:normal zIndex is 0'
    );
    setState.call(point, 'hover');
    assert.strictEqual(
        point.graphic.zIndex,
        1,
        'When state:hover zIndex is 1'
    );
    setState.call(point, 'select');
    assert.strictEqual(
        point.graphic.zIndex,
        0,
        'When state:select zIndex is 0'
    );
});