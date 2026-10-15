/**
 * IPPure Panel Script for Surge
 * Version: 1.1
 *
 * 功能:
 * - 监控模块参数指定策略组的最优节点
 * - 显示: 节点名称 | 纯净度% | IP类型 | 地理位置 | 延迟
 * - 通过实时测量 API 响应时间获取延迟
 */

const API_URL = "https://my.ippure.com/v1/info";
const DEFAULT_POLICY_GROUP = "✈️ 我的节点（所有订阅）";
const MODULE_PLACEHOLDER = "{{{policy_group}}}";

function resolvePolicyGroup() {
    if (typeof $argument !== "string") return DEFAULT_POLICY_GROUP;
    const value = $argument.trim();
    if (!value || value === MODULE_PLACEHOLDER || value.includes("{{{")) {
        return DEFAULT_POLICY_GROUP;
    }
    return value;
}

const POLICY_GROUP = resolvePolicyGroup();

function isChinese() {
    const lang = ($environment.language || "").toLowerCase();
    return lang.startsWith("zh");
}

async function fetchIP(policy) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        const timeout = 4000;
        const options = { url: API_URL, timeout: timeout };
        if (policy) options.policy = policy;

        $httpClient.get(options, (error, response, data) => {
            const latency = Date.now() - startTime;
            if (error || !data) {
                resolve({ data: null, latency: null });
            } else {
                try {
                    const json = JSON.parse(data);
                    resolve({ data: json, latency: latency });
                } catch (e) {
                    resolve({ data: null, latency: null });
                }
            }
        });
    });
}

function formatInfo(json, nodeName, latency) {
    if (!json) return isChinese() ? "获取失败" : "Failed";

    const score = json.fraudScore || 0;
    const purity = 100 - score; // Convert fraud score to purity percentage
    const isRes = !!json.isResidential;
    const isBrd = !!json.isBroadcast;

    const typeText = isChinese()
        ? `${isRes ? "住宅" : "机房"}·${isBrd ? "广播" : "原生"}`
        : `${isRes ? "Res" : "DC"}·${isBrd ? "Brd" : "Nat"}`;

    const location = json.city || json.region || json.country || "?";
    const latencyText = latency !== null ? `${latency}ms` : "?";

    // Format: NodeName | Purity% | IP Type | Location | Latency
    if (isChinese()) {
        return `${nodeName}\n纯净度: ${purity}% | ${typeText}\n${location} | 延迟: ${latencyText}`;
    } else {
        return `${nodeName}\nPurity: ${purity}% | ${typeText}\n${location} | ${latencyText}`;
    }
}

(async () => {
    let nodeName = POLICY_GROUP;

    // Get the selected node from the policy group
    if (typeof $surge !== "undefined") {
        try {
            const details = $surge.selectGroupDetails();
            nodeName = details.decisions[POLICY_GROUP] || POLICY_GROUP;
        } catch (e) {
            console.log(`[IPPure] Failed to get node info: ${e.message}`);
        }
    }

    // Fetch IP info using the selected node and measure latency
    const result = await fetchIP(nodeName);
    const ipData = result.data;
    const latency = result.latency;

    const content = formatInfo(ipData, nodeName, latency);

    // Icon based on purity percentage
    const score = (ipData && ipData.fraudScore) || 0;
    const purity = 100 - score;
    let riskColor = "#88A788";
    let riskIcon = "shield.check.fill";
    if (purity < 30) {
        riskColor = "#C44";
        riskIcon = "shield.xmark.fill";
    } else if (purity < 60) {
        riskColor = "#D4A017";
        riskIcon = "exclamationmark.shield.fill";
    }

    $done({
        title: isChinese() ? "IPPure 节点监控" : "IPPure Node Monitor",
        content: content,
        icon: riskIcon,
        "icon-color": riskColor
    });
})();
