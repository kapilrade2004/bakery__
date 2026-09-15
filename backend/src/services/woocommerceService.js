const axios = require("axios");
const wooConfig = require("../config/woocommerce");
let orderCountsCache = null;
let orderCountsCachedAt = 0;

const getAxiosInstance = () => {
  const authHeader = wooConfig.getAuthHeader();
  const headers = {
    "Content-Type": "application/json",
  };
  if (authHeader) {
    headers["Authorization"] = authHeader;
  }
  return axios.create({
    baseURL: wooConfig.baseUrl,
    headers,
    timeout: 10000,
  });
};

const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const shouldRetry = (error) =>
  !error.response || (error.response.status >= 500 && error.response.status < 600);

const getWithRetry = async (client, path, config, attempt = 0) => {
  try {
    return await client.get(path, config);
  } catch (error) {
    if (attempt >= 2 || !shouldRetry(error)) {
      throw error;
    }
    await sleep(500 * (attempt + 1));
    return getWithRetry(client, path, config, attempt + 1);
  }
};

const getPageCount = (headers) =>
  Number.parseInt(headers["x-wp-totalpages"] || headers["X-WP-TotalPages"], 10);

const fetchAllPages = async (client, path, params) => {
  const firstResponse = await getWithRetry(client, path, {
    params: { ...params, page: 1 },
  });
  const firstPage = Array.isArray(firstResponse.data) ? firstResponse.data : [];
  const totalPages = getPageCount(firstResponse.headers);

  if (!Number.isFinite(totalPages) || totalPages <= 1) {
    return firstPage;
  }

  const remainingPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      getWithRetry(client, path, {
        params: { ...params, page: index + 2 },
      }),
    ),
  );

  return [
    ...firstPage,
    ...remainingPages.flatMap((response) =>
      Array.isArray(response.data) ? response.data : [],
    ),
  ];
};

const getProducts = async (params = {}) => {
  try {
    const client = getAxiosInstance();
    const requestedPerPage = Number.parseInt(params.per_page, 10);
    const perPage = Number.isFinite(requestedPerPage)
      ? Math.min(Math.max(requestedPerPage, 1), 100)
      : 100;
    return await fetchAllPages(client, "/wp-json/wc/v3/products", {
      ...params,
      per_page: perPage,
    });
  } catch (error) {
    console.error("WooCommerce getProducts error:", error.response?.data || error.message);
    throw error;
  }
};

const getProductById = async (id) => {
  try {
    const client = getAxiosInstance();
    const response = await getWithRetry(client, `/wp-json/wc/v3/products/${id}`, {});
    return response.data;
  } catch (error) {
    console.error(`WooCommerce getProductById (${id}) error:`, error.response?.data || error.message);
    throw error;
  }
};

const getOrders = async (params = {}) => {
  try {
    const client = getAxiosInstance();
    const requestedPerPage = Number.parseInt(params.per_page, 10);
    const perPage = Number.isFinite(requestedPerPage)
      ? Math.min(Math.max(requestedPerPage, 1), 100)
      : 100;
    return await fetchAllPages(client, "/wp-json/wc/v3/orders", {
      ...params,
      per_page: perPage,
    });
  } catch (error) {
    console.error("WooCommerce getOrders error:", error.response?.data || error.message);
    throw error;
  }
};

const getOrdersPage = async (params = {}) => {
  try {
    const client = getAxiosInstance();
    const requestedPage = Number.parseInt(params.page, 10);
    const requestedPerPage = Number.parseInt(params.per_page, 10);
    const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const perPage = Number.isFinite(requestedPerPage)
      ? Math.min(Math.max(requestedPerPage, 1), 100)
      : 25;
    const response = await getWithRetry(client, "/wp-json/wc/v3/orders", {
      params: { ...params, page, per_page: perPage },
    });
    const total = Number.parseInt(response.headers["x-wp-total"], 10) || 0;
    const totalPages = Number.parseInt(response.headers["x-wp-totalpages"], 10) || 1;
    return {
      orders: Array.isArray(response.data) ? response.data : [],
      total,
      totalPages,
      page,
      perPage,
    };
  } catch (error) {
    console.error("WooCommerce getOrdersPage error:", error.response?.data || error.message);
    throw error;
  }
};

const getOrderCounts = async () => {
  if (orderCountsCache && Date.now() - orderCountsCachedAt < 30000) {
    return orderCountsCache;
  }
  const client = getAxiosInstance();
  const statuses = ["all", "pending", "processing", "on-hold", "completed", "cancelled", "qr-sent", "shipped"];
  const results = await Promise.all(statuses.map(async (status) => {
    const params = { per_page: 1 };
    if (status !== "all") params.status = status === "qr-sent" ? "qrsent" : status;
    const response = await getWithRetry(client, "/wp-json/wc/v3/orders", { params });
    return [status, Number.parseInt(response.headers["x-wp-total"], 10) || 0];
  }));
  orderCountsCache = Object.fromEntries(results);
  orderCountsCachedAt = Date.now();
  return orderCountsCache;
};

const getOrderById = async (id) => {
  try {
    const client = getAxiosInstance();
    const response = await getWithRetry(client, `/wp-json/wc/v3/orders/${id}`, {});
    return response.data;
  } catch (error) {
    console.error(`WooCommerce getOrderById (${id}) error:`, error.response?.data || error.message);
    throw error;
  }
};

const createOrder = async (orderData) => {
  try {
    const client = getAxiosInstance();
    const response = await client.post("/wp-json/wc/v3/orders", orderData);
    return response.data;
  } catch (error) {
    console.error("WooCommerce createOrder error:", error.response?.data || error.message);
    throw error;
  }
};

module.exports = {
  getProducts,
  getProductById,
  getOrders,
  getOrdersPage,
  getOrderCounts,
  getOrderById,
  createOrder,
};
