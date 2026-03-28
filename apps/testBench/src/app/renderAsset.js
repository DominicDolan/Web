function attrsToHtml(attrs) {
    if (!attrs || Object.keys(attrs).length === 0) return '';
    return ' ' + Object.entries(attrs)
        .map(([key, value]) => {
            if (value === true) return key;
            if (value === false || value === null || value === undefined) return '';
            return `${key}="${String(value).replace(/"/g, '&quot;')}"`;
        })
        .filter(Boolean)
        .join(' ');
}

const assetMap = {
    style: (props) => {
        return `<style${attrsToHtml(props.attrs)}>${props.children ?? ''}</style>`;
    },
    link: (props) => {
        return `<link${attrsToHtml(props.attrs)} />`;
    },
    script: (props) => {
        const attrs = props.key ? {...props.attrs, id: props.key} : props.attrs;
        return props.attrs.src ? `<script${attrsToHtml(attrs)}></script>` : null;
    },
};

export function renderAsset(asset) {
    let {tag, attrs: {key, ...attrs} = {key: undefined}, children} = asset;
    return assetMap[tag]({attrs, key, children});
}
