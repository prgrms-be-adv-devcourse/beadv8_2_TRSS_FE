"""팔레트 디자인 캔버스(.dc.html)를 React + TypeScript 페이지로 바꾸는 일회성 변환 스크립트."""
import json, os, re, sys

SRC = sys.argv[1]
OUT = sys.argv[2]
LOGIC_DIR = sys.argv[3]

ROUTES = {
    'Main': '/', 'ProductDetail': '/product', 'Cart': '/cart', 'Checkout': '/checkout',
    'PaymentPopups': '/checkout/popups', 'OrderList': '/orders', 'OrderDetail': '/orders/detail',
    'OrderErrors': '/orders/errors', 'Wallet': '/wallet', 'TopupResult': '/wallet/topup-result',
    'Login': '/login', 'Signup': '/signup', 'MyPage': '/mypage',
    'SellerApply': '/seller/apply', 'SellerProducts': '/seller/products', 'SellerProductForm': '/seller/products/new',
    'SellerStock': '/seller/stock', 'SellerOrders': '/seller/orders', 'SellerSettlements': '/seller/settlements',
    'SellerInfo': '/seller/info',
    'AdminSellers': '/admin/sellers', 'AdminMembers': '/admin/members', 'AdminProducts': '/admin/products',
    'AdminReturns': '/admin/returns', 'AdminPayments': '/admin/payments', 'AdminFailed': '/admin/failed',
    'AdminSettlements': '/admin/settlements', 'AdminRetryModal': '/admin/settlements/retry-modal',
}
IMAGES = {
    'fad0e591d0d8a087102637e2d5b3091e': '/images/logo.png',
    '583723623fcbb95205d454bebdaa4193': '/images/toner.jpg', '5b8e90fe53db177767270118bbfa2609': '/images/cica-cream.jpg',
    '3a8e62d06af95adf457e02d0a07c5f44': '/images/cleansing-foam.jpg', '0cb082bd7257da7528de9fdc46e367bd': '/images/serum.jpg',
    '329139e5e8b41f10592699fe607cb9dc': '/images/sunscreen.jpg', '61d72684bdd5502a4024fbf8ee3533f5': '/images/ceramide-cream.jpg',
    'fcdc260b4250040062aa628a35b12bf7': '/images/mask-pack.jpg', 'f96e7e54dfb3e68039e7a0e027764dcb': '/images/cushion.jpg',
    'e06516c4746fca282b0cea05f3a59c16': '/images/tshirt.jpg', 'a6c8a93953f4a862868f7e2a817a11ec': '/images/windbreaker.jpg',
}
# 변환 뒤 손으로 다듬는 부분
PATCHES = {
    'Wallet': [(' value={amountStr} ', ' value={amountStr} onChange={changeAmount} inputMode="numeric" ')],
}
VOID = {'img', 'input', 'br', 'meta', 'link', 'hr', 'source', 'col', 'wbr'}
BOOL_ATTRS = {'disabled', 'checked', 'selected', 'required', 'hidden', 'readonly', 'multiple', 'autofocus'}
ATTR_MAP = {'class': 'className', 'for': 'htmlFor', 'tabindex': 'tabIndex', 'readonly': 'readOnly', 'maxlength': 'maxLength',
            'inputmode': 'inputMode', 'autocomplete': 'autoComplete', 'colspan': 'colSpan', 'rowspan': 'rowSpan',
            'autofocus': 'autoFocus', 'onclick': 'onClick', 'onchange': 'onChange', 'oninput': 'onInput'}
HOLE = re.compile(r'\{\{(.*?)\}\}')

def blob(s):
    return re.sub(r'/_blob/([0-9a-f]{32})', lambda m: IMAGES.get(m.group(1), m.group(0)), s)

# ---------------- CSS ----------------
def split_rules(css):
    """최상위 규칙을 (prelude, body) 목록으로 나눠요."""
    out, i, n = [], 0, len(css)
    while i < n:
        j = css.find('{', i)
        if j < 0: break
        prelude = css[i:j].strip()
        depth, k = 1, j + 1
        while depth and k < n:
            if css[k] == '{': depth += 1
            elif css[k] == '}': depth -= 1
            k += 1
        out.append((prelude, css[j + 1:k - 1]))
        i = k
    return out

GLOBAL_SELECTORS = {'body', 'h1,h2,h3', 'a', 'a:hover', '*:focus-visible'}

def page_css(css):
    body_decl = ''
    parts = []
    for pre, body in split_rules(css):
        if pre.startswith('@font-face'): continue
        if pre.startswith('@media'):
            if 'prefers-reduced-motion' in pre: continue
            inner = page_css_rules(body)
            parts.append(f'{pre} {{\n{inner}\n}}')
            continue
        if pre == 'body':
            body_decl = body
            continue
        if pre in GLOBAL_SELECTORS: continue
        parts.append(rule(pre, body))
    return body_decl, '\n'.join(parts)

def page_css_rules(css):
    return '\n'.join(rule(p, b) for p, b in split_rules(css))

def rule(pre, body):
    sels = []
    for sel in pre.split(','):
        sel = sel.strip()
        if not sel.startswith('.'):
            sel = '.page ' + sel
        sels.append(sel)
    decls = ';\n  '.join(d.strip() for d in body.split(';') if d.strip())
    return f"{', '.join(sels)} {{\n  {decls};\n}}"

def class_names(css):
    return set(re.findall(r'\.(-?[_a-zA-Z][\w-]*)', css))

# ---------------- HTML tree ----------------
TOKEN = re.compile(r'<!--.*?-->|<(/?)([a-zA-Z][\w-]*)((?:\s+[^\s=>/]+(?:\s*=\s*(?:"[^"]*"|\'[^\']*\'|[^\s>]+))?)*)\s*(/?)>|([^<]+)', re.S)
ATTR = re.compile(r'([^\s=>/]+)(?:\s*=\s*(?:"([^"]*)"|\'([^\']*)\'|([^\s>]+)))?')

class Node:
    def __init__(self, tag, attrs=None):
        self.tag, self.attrs, self.children = tag, attrs or [], []

def parse(html):
    root = Node('#root'); stack = [root]
    for m in TOKEN.finditer(html):
        text = m.group(5)
        if m.group(0).startswith('<!--'): continue
        if text is not None:
            stack[-1].children.append(text); continue
        close, tag, attrs, selfclose = m.group(1), m.group(2), m.group(3), m.group(4)
        if close:
            while len(stack) > 1:
                n = stack.pop()
                if n.tag == tag: break
            continue
        al = []
        for a in ATTR.finditer(attrs or ''):
            v = a.group(2) if a.group(2) is not None else a.group(3) if a.group(3) is not None else a.group(4)
            al.append((a.group(1), v))
        node = Node(tag, al)
        stack[-1].children.append(node)
        if not selfclose and tag.lower() not in VOID:
            stack.append(node)
    return root

# ---------------- JSX ----------------
def js_str(s):
    return json.dumps(s, ensure_ascii=False)

def tmpl(s):
    """'a{{x}}b' → `a${x}b`"""
    s = s.replace('\\', '\\\\').replace('`', '\\`')
    s = re.sub(r'\$(?!\{)', r'\\$', s)
    return '`' + HOLE.sub(lambda m: '${' + m.group(1).strip() + '}', s) + '`'

def full_hole(v):
    m = HOLE.fullmatch(v.strip()) if v is not None else None
    return m.group(1).strip() if m else None

def style_obj(text):
    items = []
    for decl in text.split(';'):
        if ':' not in decl: continue
        p, v = decl.split(':', 1)
        p, v = p.strip(), v.strip()
        if not p: continue
        key = p if p.startswith('--') else re.sub(r'-([a-z])', lambda m: m.group(1).upper(), p)
        key = js_str(key) if not re.fullmatch(r'[A-Za-z_]\w*', key) else key
        items.append(f'{key}: {js_str(v)}')
    return '{ ' + ', '.join(items) + ' }'

def attr_name(name):
    low = name.lower()
    if low in ATTR_MAP: return ATTR_MAP[low]
    if name.startswith(('aria-', 'data-')): return name
    if '-' in name:
        return re.sub(r'-([a-z])', lambda m: m.group(1).upper(), name)
    return name

class Ctx:
    def __init__(self):
        self.used = set()      # 최상위 hole 식별자
        self.scope = []        # sc-for 변수
        self.link = False
        self.css_fn = False
        self.components = set()

    def note(self, expr):
        for ident in re.findall(r'(?<![\w.$])([A-Za-z_$][\w$]*)', re.sub(r"'[^']*'|\"[^\"]*\"", '', expr)):
            if ident in ('true', 'false', 'null', 'undefined'): continue
            if ident not in self.scope:
                self.used.add(ident)
            break

def expr_of(v, ctx):
    e = full_hole(v)
    if e is not None:
        ctx.note(e); return e
    for m in HOLE.finditer(v): ctx.note(m.group(1).strip())
    return None

def render_attrs(node, ctx, extra=None):
    out = []
    tag = node.tag
    is_comp = tag[0].isupper()
    for name, val in node.attrs:
        low = name.lower()
        if low.startswith('hint-placeholder'): continue
        if low == 'xmlns': continue
        if low == 'href' and tag == 'a' and val and full_hole(val):
            e0 = full_hole(val); ctx.note(e0); out.append(f'to={{{e0}}}'); ctx.link = True; continue
        if low == 'oninput' and tag in ('input', 'textarea'):
            name, low = 'onChange', 'onchange'
        if low == 'href' and tag == 'a' and val and re.match(r'^[A-Za-z]+\.dc\.html', val):
            page, _, frag = val.partition('#')
            route = ROUTES.get(page.replace('.dc.html', ''), '/')
            out.append(f'to={js_str(route)}'); ctx.link = True; continue
        if val is None:
            out.append(attr_name(name) if low not in ('checked',) else 'defaultChecked'); continue
        val = blob(val)
        e = full_hole(val)
        if low == 'class':
            if e is not None:
                ctx.note(e); out.append(f'className={{cx({e})}}')
            elif '{{' in val:
                expr_of(val, ctx); out.append(f'className={{cx({tmpl(val)})}}')
            else:
                out.append(f'className={{cx({js_str(val)})}}')
            continue
        if low == 'style':
            if e is not None:
                ctx.note(e); ctx.css_fn = True; out.append(f'style={{css({e})}}')
            elif '{{' in val:
                expr_of(val, ctx); ctx.css_fn = True; out.append(f'style={{css({tmpl(val)})}}')
            else:
                out.append(f'style={{{style_obj(val)}}}')
            continue
        n = attr_name(name)
        if low == 'value' and tag in ('input', 'textarea') and e is None:
            n = 'defaultValue'
        if low == 'checked' and e is None:
            out.append('defaultChecked'); continue
        if low in BOOL_ATTRS and e is None and val in ('', low):
            out.append(n); continue
        if e is not None:
            ctx.note(e); out.append(f'{n}={{{e}}}')
        elif '{{' in val:
            expr_of(val, ctx); out.append(f'{n}={{{tmpl(val)}}}')
        else:
            out.append(f'{n}={js_str(val)}')
    if extra: out.extend(extra)
    # checked가 hole인데 onChange가 없으면 readOnly
    names = [o.split('=')[0] for o in out]
    if 'checked' in names and 'onChange' not in names:
        out.append('readOnly')
    return out

def text_jsx(t, ctx):
    if not t.strip():
        return ' ' if '\n' not in t and t else ''
    parts = []
    last = 0
    for m in HOLE.finditer(t):
        parts.append(esc_text(t[last:m.start()]))
        e = m.group(1).strip(); ctx.note(e)
        parts.append('{' + e + '}')
        last = m.end()
    parts.append(esc_text(t[last:]))
    return ''.join(parts)

def esc_text(s):
    return s.replace('{', "{'{'}").replace('}', "{'}'}").replace('>', '&gt;')

def children_jsx(node, ctx):
    return ''.join(node_jsx(c, ctx) for c in node.children)

def node_jsx(node, ctx, key=None):
    if isinstance(node, str):
        return text_jsx(node, ctx)
    tag = node.tag
    if tag == 'sc-for':
        attrs = dict(node.attrs)
        lst = full_hole(attrs['list']); ctx.note(lst)
        var = attrs.get('as', 'item'); idx = var + 'Index'
        ctx.scope.append(var)
        kids = [c for c in node.children if not (isinstance(c, str) and not c.strip())]
        if len(kids) == 1 and not isinstance(kids[0], str):
            inner = node_jsx(kids[0], ctx, key=idx)
        else:
            inner = f'<Fragment key={{{idx}}}>{children_jsx(node, ctx)}</Fragment>'
            ctx.components.add('Fragment')
        ctx.scope.pop()
        return f'{{{lst}.map(({var}, {idx}) => ({inner}))}}'
    if tag == 'sc-if':
        cond = full_hole(dict(node.attrs)['value']); ctx.note(cond)
        return f'{{{cond} && (<>{children_jsx(node, ctx)}</>)}}'
    jtag = tag
    if tag == 'a' and any(n == 'href' and v and (re.match(r'^[A-Za-z]+\.dc\.html', v) or full_hole(v)) for n, v in node.attrs):
        jtag = 'Link'
    if tag[0].isupper():
        ctx.components.add(tag)
    extra = [f'key={{{key}}}'] if key else None
    # select: option selected → defaultValue
    if tag == 'select':
        sel = None
        for o in node.children:
            if isinstance(o, Node) and o.tag == 'option' and any(n == 'selected' for n, _ in o.attrs):
                v = dict(o.attrs).get('value') or ''.join(c for c in o.children if isinstance(c, str))
                sel = v.strip()
                o.attrs = [(n, v2) for n, v2 in o.attrs if n != 'selected']
        if sel is not None:
            extra = (extra or []) + [f'defaultValue={js_str(sel)}']
    if tag == 'textarea':
        txt = ''.join(c for c in node.children if isinstance(c, str))
        node.children = []
        if txt.strip():
            extra = (extra or []) + [f'defaultValue={js_str(txt)}']
    attrs = render_attrs(node, ctx, extra)
    head = f'<{jtag}' + (' ' + ' '.join(attrs) if attrs else '')
    if tag.lower() in VOID or (not node.children and tag in ('circle', 'path', 'rect', 'line', 'polyline', 'polygon', 'ellipse', 'stop')):
        return head + ' />'
    if not node.children and tag[0].isupper():
        return head + ' />'
    return head + '>' + children_jsx(node, ctx) + f'</{jtag}>'

# ---------------- page transforms ----------------
ADMIN_ACTIVE = re.compile(r'background:#45454F;color:#fff;font-weight:700">([^<]+)</a>')
SELLER_ACTIVE = re.compile(r'background:#F3F1F6;color:#8A6A2C;font-weight:700">([^<]+)</a>')

def transform(name, body):
    """공통 헤더와 사이드바를 레이아웃 컴포넌트로 바꿔요."""
    m = re.match(r'\s*<div style="(position:relative;)?display:flex;flex-direction:column;min-height:(\d+)px;background:#FAFAFB">\s*<header.*?</header>\s*<div style="flex:1;display:flex;flex-wrap:wrap">\s*<nav aria-label="(관리자 메뉴|판매자 센터 메뉴)".*?</nav>\s*<main[^>]*>(.*)</main>(.*)</div>\s*</div>\s*$', body, re.S)
    if m:
        kind = 'AdminLayout' if m.group(3) == '관리자 메뉴' else 'SellerLayout'
        act = (ADMIN_ACTIVE if kind == 'AdminLayout' else SELLER_ACTIVE).search(body).group(1)
        inner, overlay = m.group(4), m.group(5)
        return (f'<{kind} active="{act}" min-height="{{{{{m.group(2)}}}}}">{inner}</{kind}>{overlay}', bool(overlay.strip()))
    h = re.search(r'<header style="background:#fff;border-bottom:3px solid transparent.*?</header>', body, re.S)
    if h:
        hd = h.group(0)
        active = None
        for key, page in (('wallet', 'Wallet'), ('cart', 'Cart'), ('orders', 'OrderList'), ('mypage', 'MyPage')):
            if re.search(rf'<a href="{page}\.dc\.html"[^>]*aria-current="page"', hd): active = key
        cnt = re.search(r'aria-label="장바구니 (\d+)개"', hd)
        attrs = ''
        if active: attrs += f' active="{active}"'
        if cnt and cnt.group(1) != '3': attrs += f' cart-count="{{{{{cnt.group(1)}}}}}"'
        if '상품명으로 찾기' not in hd: attrs += ' compact'
        body = body.replace(hd, f'<BuyerHeader{attrs}></BuyerHeader>')
    return body, False

def pascal(name):
    return name[0].upper() + name[1:]

def convert(fname):
    name = fname.replace('.dc.html', '')
    src = open(os.path.join(SRC, fname), encoding='utf-8').read()
    css_text = re.search(r'<style>(.*?)</style>', src, re.S).group(1)
    body = src.split('</helmet>', 1)[1].rsplit('</x-dc>', 1)[0]
    title = re.search(r'<title>(.*?)</title>', src).group(1)
    body, overlay = transform(name, blob(body))
    body_decl, pcss = page_css(blob(css_text))
    # .page 루트 스타일
    bg = re.search(r'background:([^;]+)', body_decl)
    lh = re.search(r'line-height:([^;]+)', body_decl)
    page_rule = '.page {\n  min-height: 100vh;\n'
    if bg: page_rule += f'  background: {bg.group(1)};\n'
    if lh: page_rule += f'  line-height: {lh.group(1)};\n'
    if overlay: page_rule += '  position: relative;\n'
    page_rule += '}\n'
    module_css = page_rule + '\n' + pcss + '\n'
    ctx = Ctx()
    tree = parse(body)
    jsx = children_jsx(tree, ctx).strip()
    logic_path = os.path.join(LOGIC_DIR, name + '.tsx')
    logic = open(logic_path, encoding='utf-8').read() if os.path.exists(logic_path) else ''
    imports = ["import { makeCx" + (", css" if ctx.css_fn else "") + " } from '../lib/ui'",
               f"import styles from './{name}.module.css'"]
    rr = []
    if ctx.link: rr.append('Link')
    if rr: imports.insert(0, f"import {{ {', '.join(rr)} }} from 'react-router-dom'")
    if 'Fragment' in ctx.components: imports.insert(0, "import { Fragment } from 'react'")
    for comp, path in (('BuyerHeader', '../components/BuyerHeader'), ('AdminLayout', '../components/AdminLayout'), ('SellerLayout', '../components/SellerLayout')):
        if comp in ctx.components: imports.append(f"import {comp} from '{path}'")
    head_logic, body_logic, props_sig = '', '', ''
    if logic:
        parts = logic.split('// ---- body ----')
        head_logic = parts[0].strip()
        body_logic = parts[1].strip() if len(parts) > 1 else ''
        sig = re.search(r'// props: (.*)', head_logic)
        if sig:
            props_sig = sig.group(1).strip()
            head_logic = head_logic.replace(sig.group(0), '').strip()
    for old, new in PATCHES.get(name, []):
        for m in HOLE.finditer(new): pass
        ctx.used.update(re.findall(r'=\{([A-Za-z_]\w*)\}', new))
    used = sorted(ctx.used - {'cx', 'css', 'styles'})
    destructure = f"  const {{ {', '.join(used)} }} = view\n" if used else ''
    if used and not body_logic:
        print(f'!! {name}: logic needed for {used}')
    code = '\n'.join(imports) + '\n'
    if head_logic: code += '\n' + head_logic + '\n'
    code += '\nconst cx = makeCx(styles)\n\n'
    hook = f'use{pascal(name)}View'
    if body_logic:
        code += f'/** 화면 상태와 화면에 그릴 값을 만들어요. */\nfunction {hook}({props_sig}) {{\n'
        code += '  ' + body_logic.replace('\n', '\n  ') + '\n  return view\n}\n\n'
    code += f'/** {title} */\n'
    if body_logic:
        if props_sig:
            ptype = props_sig.split(':', 1)[1].strip()
            code += f'export default function {pascal(name)}Page(props: {ptype}) {{\n'
            code += f'  const view = {hook}(props)\n'
        else:
            code += f'export default function {pascal(name)}Page() {{\n'
            code += f'  const view = {hook}()\n'
    else:
        code += f'export default function {pascal(name)}Page() {{\n'
    code += destructure
    code += f'  return (\n    <div className={{styles.page}}>{jsx}</div>\n  )\n}}\n'
    for old, new in PATCHES.get(name, []):
        assert old in code, (name, old)
        code = code.replace(old, new)
    open(os.path.join(OUT, name + '.tsx'), 'w', encoding='utf-8').write(code)
    open(os.path.join(OUT, name + '.module.css'), 'w', encoding='utf-8').write(module_css)
    return name, used

if __name__ == '__main__':
    files = sorted(f for f in os.listdir(SRC) if f.endswith('.dc.html'))
    for f in files:
        n, used = convert(f)
        print(n, used)
