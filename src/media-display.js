// All media results remain visible, including unknown states and their evidence.
function renderMediaList(rows) {
    if (!rows.length) return mutedLine("本次没有服务检测结果");
    return rows.map((row) => {
        const status = mediaStatus(row.status);
        const icon = row.status === "yes" ? "✅"
            : row.status === "partial" ? "🟠"
            : row.status === "no" ? "❌" : "⚪";
        const summary = `${status.text}${row.region ? ` · [${row.region}]` : ""}`;
        const reason = row.detail || (row.status === "unknown" ? "未返回可判定信息" : "");
        return '<div class="media-result" style="margin-bottom:12px">'
            + `<div><span>${icon}</span>&nbsp;<span style="font-weight:700">${escapeHtml(row.name)}</span>&nbsp;&nbsp;`
            + `<span style="color:${status.color};font-weight:600">${escapeHtml(summary)}</span></div>`
            + (reason ? `<div style="font-size:11px;color:#8e8e93;margin-top:2px">${escapeHtml(reason)}</div>` : "")
            + "</div>";
    }).join("");
}
