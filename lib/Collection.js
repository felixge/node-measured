const Optional = require('optional-js');
const Counter = require('./metrics/Counter');
const Gauge = require('./metrics/Gauge');
const SettableGauge = require('./metrics/SettableGauge');
const Histogram = require('./metrics/Histogram');
const Meter = require('./metrics/Meter');
const Timer = require('./metrics/Timer');
const METRIC_TYPES = require('./metrics/Metric').METRIC_TYPES;

/**
 * A Simple collection that stores names and a {@link Metric} instances with a few convenience methods for
 * creating / registering and then gathering all data the registered metrics.
 */
class Collection {
  /**
   * Creates a named collection of metrics
   * @param {string} name The name to use for this collection.
   * @example
   * var { Collection } = require('measured');
   * const collection = new Collection('node-process-metrics');
   * const gauge = collection.gauge('node.process.heap_used', () => {
   *    return process.memoryUsage().heapUsed;
   * });
   */
  constructor(name) {
    this.name = name;

    /**
     * internal map of metric name to {@see Metric}
     * @type {Object.<string, Metric>}
     * @private
     */
    this._metrics = {};
  }

  /**
   * register a metric that was created outside the provided convenience methods of this collection
   * @param name The metric name
   * @param metric The {@link Metric} implementation
   * @example
   * var { Collection, Gauge } = require('measured');
   * const collection = new Collection('node-process-metrics');
   * const gauge = new Gauge(() => {
   *    return process.memoryUsage().heapUsed;
   * });
   * collection.register('node.process.heap_used', gauge);
   */
  register(name, metric) {
    this._metrics[name] = metric;
  }

  /**
   * Fetches the data/values from all registered metrics
   * @return {Object} The combined JSON object
   */
  toJSON() {
    const json = {};

    let metric;
    for (metric in this._metrics) {
      if (this._metrics.hasOwnProperty(metric)) {
        json[metric] = this._metrics[metric].toJSON();
      }
    }

    if (!this.name) {
      return json;
    }

    const wrapper = {};
    wrapper[this.name] = json;

    return wrapper;
  }

  /**
   * Gets or creates and registers a {@link Gauge}
   * @param {string} name The metric name
   * @param {function} readFn See {@link Gauge}
   * @return {Gauge}
   */
  gauge(name, readFn) {
    this._validateName(name);

    let gauge;
    this._getMetricForNameAndType(name, METRIC_TYPES.GAUGE).ifPresentOrElse(
      registeredMetric => (gauge = registeredMetric),
      () => {
        gauge = new Gauge(readFn);
        this.register(name, gauge);
      }
    );
    return gauge;
  }

  /**
   * Gets or creates and registers a {@link Counter}
   * @param {string} name The metric name
   * @param {CounterProperties} properties See {@link CounterProperties}
   * @return {Counter}
   */
  counter(name, properties) {
    this._validateName(name);

    let counter;
    this._getMetricForNameAndType(name, METRIC_TYPES.COUNTER).ifPresentOrElse(
      registeredMetric => (counter = registeredMetric),
      () => {
        counter = new Counter(properties);
        this.register(name, counter);
      }
    );
    return counter;
  }

  /**
   * Gets or creates and registers a {@link Histogram}
   * @param {string} name The metric name
   * @param {HistogramProperties} properties See {@link HistogramProperties}
   * @return {Histogram}
   */
  histogram(name, properties) {
    this._validateName(name);

    let histogram;
    this._getMetricForNameAndType(name, METRIC_TYPES.HISTOGRAM).ifPresentOrElse(
      registeredMetric => (histogram = registeredMetric),
      () => {
        histogram = new Histogram(properties);
        this.register(name, histogram);
      }
    );
    return histogram;
  }

  /**
   * Gets or creates and registers a {@link Timer}
   * @param {string} name The metric name
   * @param {HistogramProperties} properties See {@link TimerProperties}
   * @return {Timer}
   */
  timer(name, properties) {
    this._validateName(name);

    let timer;
    this._getMetricForNameAndType(name, METRIC_TYPES.TIMER).ifPresentOrElse(
      registeredMetric => (timer = registeredMetric),
      () => {
        timer = new Timer(properties);
        this.register(name, timer);
      }
    );
    return timer;
  }

  /**
   * Gets or creates and registers a {@link Meter}
   * @param {string} name The metric name
   * @param {MeterProperties} properties See {@link MeterProperties}
   * @return {Meter}
   */
  meter(name, properties) {
    this._validateName(name);

    let meter;
    this._getMetricForNameAndType(name, METRIC_TYPES.METER).ifPresentOrElse(
      registeredMetric => (meter = registeredMetric),
      () => {
        meter = new Meter(properties);
        this.register(name, meter);
      }
    );
    return meter;
  }

  /**
   * Gets or creates and registers a {@link SettableGauge}
   * @param {string} name The metric name
   * @param {SettableGaugeProperties} properties See {@link SettableGaugeProperties}
   * @return {SettableGauge}
   */
  settableGauge(name, properties) {
    this._validateName(name);

    let settableGauge;
    this._getMetricForNameAndType(name, METRIC_TYPES.METER).ifPresentOrElse(
      registeredMetric => (settableGauge = registeredMetric),
      () => {
        settableGauge = new SettableGauge(properties);
        this.register(name, settableGauge);
      }
    );
    return settableGauge;
  }

  /**
   * Checks the registry for a metric with a given name and type, if it exists in the registry as a
   * different type an error is thrown.
   * @param {string} name The metric name
   * @param {string} requestedType The metric type
   * @return {Optional<Metric>}
   * @private
   */
  _getMetricForNameAndType(name, requestedType) {
    if (this._metrics[name]) {
      const metric = this._metrics[name];
      const actualType = metric.getType();
      if (requestedType !== actualType) {
        throw new Error(
          `You requested a metric of type: ${requestedType} with name: ${name}, but it exists in the registry as type: ${actualType}`
        );
      }
      return Optional.of(metric);
    }
    return Optional.empty();
  }

  /**
   * Validates that the provided name is valid
   * @param name The provided metric name param
   * @private
   */
   _validateName(name) {
    if (!name || typeof name !== 'string') {
      throw new Error('You must supply a metric name');
    }
  }
  
  /**
   * Calls end on all metrics in the registry that support end()
   */
  end() {
    const metrics = this._metrics;
    Object.keys(metrics).forEach(function(name) {
      const metric = metrics[name];
      if (metric.end) {
        metric.end();
      }
    });
  }
}

module.exports = Collection;
