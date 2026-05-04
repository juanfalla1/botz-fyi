export async function executeQuotePdfFlow(args: any): Promise<string> {
  let strictReply = String(args.strictReply || "");

  args.strictMemory.strict_quote_data_missing_attempts = 0;
  const selectedId = String(args.previousMemory?.last_selected_product_id || args.previousMemory?.last_product_id || args.strictMemory.last_selected_product_id || args.strictMemory.last_product_id || "").trim();
  const selectedName = String(args.previousMemory?.last_selected_product_name || args.previousMemory?.last_product_name || args.strictMemory.last_selected_product_name || args.strictMemory.last_product_name || "").trim();
  const selected = selectedId
    ? (args.ownerRows.find((r: any) => String(r?.id || "").trim() === selectedId) || null)
    : (selectedName ? (args.findCatalogProductByName(args.ownerRows, selectedName) || null) : null);

  const qty = Math.max(1, Number(args.previousMemory?.quote_quantity || args.strictMemory.quote_quantity || 1));
  const trm = await args.getOrFetchTrm(args.supabase, args.ownerId, args.tenantId || null);
  const trmRate = Number(trm?.rate || 0);

  if (!selected || !(trmRate > 0)) {
    args.strictMemory.awaiting_action = "none";
    args.strictMemory.quote_data = {};
    return "Recibí tus datos. No pude cerrar la cotización automática en este intento, pero ya quedó registrado y te la envío enseguida por este mismo WhatsApp.";
  }

  const effectiveCity = args.normalizeCityLabel(args.customerCity || "Bogota");
  const effectiveCompany = args.customerCompany || "Persona natural";
  const effectiveNit = args.customerNit || "N/A";
  const effectiveContact = args.customerContact || String(args.strictMemory?.crm_contact_name || "").trim() || (args.knownCustomerName || args.inbound.pushName || "Cliente");
  const effectivePhone = args.normalizePhone(args.customerPhone || String(args.strictMemory?.crm_contact_phone || "") || args.inbound.from || "");
  const cityKey = args.normalizeCityLabel(effectiveCity);
  const cityPrices = (selected as any)?.source_payload?.prices_cop || {};
  const parseCop = (v: any) => {
    const n = Number(String(v ?? "").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) && n > 0 ? n : 0;
  };
  const cityCop = parseCop((cityPrices as any)?.[cityKey]);
  const bogotaCop = parseCop((cityPrices as any)?.bogota);
  const antioquiaCop = parseCop((cityPrices as any)?.antioquia);
  const distributorCop = parseCop((cityPrices as any)?.distribuidor);
  const useDistributorPrice = args.crmTierForQuote === "distribuidor" || args.crmTypeForQuote === "distributor";
  const existingCop = parseCop((cityPrices as any)?.cliente_antiguo || (cityPrices as any)?.cliente_recurrente || (cityPrices as any)?.recurrente || (cityPrices as any)?.existing);
  const newCop = parseCop((cityPrices as any)?.cliente_nuevo || (cityPrices as any)?.new);
  const useExistingPrice = args.customerSegment === "existing" && existingCop > 0;
  const useNewPrice = args.customerSegment === "new" && newCop > 0;
  const finalCustomerCopByCity = cityKey === "antioquia" ? antioquiaCop : bogotaCop;
  const fallbackFinalCustomerCop = finalCustomerCopByCity > 0 ? finalCustomerCopByCity : (cityCop > 0 ? cityCop : (bogotaCop > 0 ? bogotaCop : antioquiaCop));
  const unitPriceCop = useDistributorPrice && distributorCop > 0 ? distributorCop : useExistingPrice ? existingCop : useNewPrice ? newCop : fallbackFinalCustomerCop;
  const baseUsdRaw = Number((selected as any)?.base_price_usd || 0);
  const basePriceUsd = baseUsdRaw > 0 ? baseUsdRaw : (unitPriceCop > 0 ? Number((unitPriceCop / trmRate).toFixed(6)) : 0);
  const totalCop = unitPriceCop > 0 ? Number((unitPriceCop * qty).toFixed(2)) : Number((basePriceUsd * trmRate * qty).toFixed(2));
  const selectedNameForQuote = String((selected as any)?.name || "producto");
  const quoteDescriptionForDraft = args.buildQuoteItemDescription(selected, selectedNameForQuote);
  const productImageDataUrlForDraft = await args.resolveProductImageDataUrl(selected);

  const draftPayload = {
    tenant_id: args.tenantId || null,
    created_by: args.ownerId,
    agent_id: String(args.agentId),
    customer_name: effectiveContact || null,
    customer_email: args.customerEmail || null,
    customer_phone: effectivePhone || null,
    company_name: effectiveCompany || null,
    location: effectiveCity || null,
    product_catalog_id: (selected as any)?.id || null,
    product_name: String((selected as any)?.name || ""),
    base_price_usd: basePriceUsd,
    trm_rate: trmRate,
    total_cop: totalCop,
    notes: "Cotizacion automatica WhatsApp (flujo estricto)",
    payload: {
      quantity: qty,
      trm_date: trm?.rate_date || null,
      trm_source: trm?.source || null,
      customer_city: effectiveCity || null,
      customer_nit: effectiveNit || null,
      customer_company: effectiveCompany || null,
      customer_contact: effectiveContact || null,
      customer_phone: effectivePhone || null,
      item_description: quoteDescriptionForDraft,
      item_image_data_url: productImageDataUrlForDraft || "",
      unit_price_cop: unitPriceCop > 0 ? unitPriceCop : null,
    },
    status: "analysis",
  };

  let { data: insertedDraft, error: draftErr } = await args.supabase.from("agent_quote_drafts").insert(draftPayload).select("id").single();
  if (draftErr && args.isQuoteDraftStatusConstraintError(draftErr)) {
    const legacyPayload = {
      ...draftPayload,
      status: "draft",
      payload: { ...(draftPayload.payload || {}), crm_stage: "analysis", crm_stage_updated_at: new Date().toISOString() },
    } as any;
    const retry = await args.supabase.from("agent_quote_drafts").insert(legacyPayload).select("id").single();
    insertedDraft = retry.data as any;
    draftErr = retry.error as any;
  }

  if (draftErr) {
    strictReply = "Recibí tus datos, pero falló la generación automática de cotización en este intento. Escríbeme 'reenviar cotización' y la intento de nuevo por este WhatsApp.";
  } else {
    let quotePdfAttached = false;
    try {
      const pdfBase64 = await args.buildQuotePdf({
        draftId: String((insertedDraft as any)?.id || ""), customerName: effectiveContact, customerEmail: args.customerEmail, customerPhone: args.customerPhone, companyName: effectiveCompany,
        productName: String((selected as any)?.name || ""), quantity: qty, basePriceUsd, trmRate, totalCop, city: effectiveCity, nit: effectiveNit,
        itemDescription: quoteDescriptionForDraft, imageDataUrl: productImageDataUrlForDraft, notes: `Ciudad: ${effectiveCity} | NIT: ${effectiveNit}`,
      });
      args.strictDocs.push({ base64: pdfBase64, fileName: args.safeFileName(`cotizacion-${String((selected as any)?.name || "producto")}-${Date.now()}.pdf`, "cotizacion", "pdf"), mimetype: "application/pdf", caption: `Cotización - ${String((selected as any)?.name || "producto")}` });
      quotePdfAttached = true;
    } catch {
      try {
        const retryPdfBase64 = await args.buildQuotePdf({
          draftId: String((insertedDraft as any)?.id || ""), customerName: effectiveContact, customerEmail: args.customerEmail, customerPhone: args.customerPhone,
          companyName: effectiveCompany, productName: selectedNameForQuote, quantity: qty, basePriceUsd, trmRate, totalCop, city: effectiveCity, nit: effectiveNit,
          itemDescription: quoteDescriptionForDraft, imageDataUrl: productImageDataUrlForDraft, notes: `Ciudad: ${effectiveCity} | NIT: ${effectiveNit}`,
        });
        if (retryPdfBase64) {
          args.strictDocs.push({ base64: retryPdfBase64, fileName: args.safeFileName(`cotizacion-${selectedNameForQuote}-${Date.now()}.pdf`, "cotizacion", "pdf"), mimetype: "application/pdf", caption: `Cotización - ${selectedNameForQuote}` });
          quotePdfAttached = true;
        }
      } catch {
        try {
          const draftId = String((insertedDraft as any)?.id || "");
          const fallbackDescription = args.buildQuoteItemDescription(selected, selectedNameForQuote);
          const fallbackImage = await args.resolveProductImageDataUrl(selected);
          const fallbackDraft = { ...(draftPayload as any), id: draftId, customer_name: effectiveContact, customer_email: args.customerEmail || null, customer_phone: args.customerPhone || null, company_name: effectiveCompany, location: effectiveCity, product_name: selectedNameForQuote, base_price_usd: basePriceUsd, trm_rate: trmRate, total_cop: totalCop, payload: { ...((draftPayload as any)?.payload || {}), quantity: qty, customer_city: effectiveCity, customer_nit: effectiveNit, item_description: fallbackDescription, item_image_data_url: fallbackImage || "" } };
          const { pdfBase64: fallbackPdfBase64, fileName: fallbackFileName } = await args.buildQuotePdfFromDraft(draftId, fallbackDraft);
          if (fallbackPdfBase64) {
            args.strictDocs.push({ base64: fallbackPdfBase64, fileName: args.safeFileName(fallbackFileName, `cotizacion-${selectedNameForQuote}`, "pdf"), mimetype: "application/pdf", caption: `Cotización - ${selectedNameForQuote}` });
            quotePdfAttached = true;
          }
        } catch {}
      }
    }

    if (quotePdfAttached) {
      let attachedSheetWithQuote = false;
      try {
        const datasheetUrlForQuote = args.pickBestProductPdfUrl(selected, `ficha tecnica ${selectedNameForQuote}`) || "";
        const localPdfPathForQuote = args.pickBestLocalPdfPath(selected, `ficha tecnica ${selectedNameForQuote}`);
        if (datasheetUrlForQuote) {
          const remote = await args.fetchRemoteFileAsBase64(datasheetUrlForQuote);
          const remoteLooksPdf = Boolean(remote) && (/application\/pdf/i.test(String(remote?.mimetype || "")) || /\.pdf(\?|$)/i.test(datasheetUrlForQuote));
          if (remote && remoteLooksPdf && Number(remote.byteSize || 0) <= args.MAX_WHATSAPP_DOC_BYTES) {
            args.strictDocs.push({ base64: remote.base64, fileName: args.safeFileName(remote.fileName, `ficha-${selectedNameForQuote}`, "pdf"), mimetype: "application/pdf", caption: `Ficha técnica - ${selectedNameForQuote}` });
            attachedSheetWithQuote = true;
          }
        }
        if (!attachedSheetWithQuote && localPdfPathForQuote) {
          const local = args.fetchLocalFileAsBase64(localPdfPathForQuote);
          if (local && Number(local.byteSize || 0) <= args.MAX_WHATSAPP_DOC_BYTES) {
            args.strictDocs.push({ base64: local.base64, fileName: args.safeFileName(local.fileName, `ficha-${selectedNameForQuote}`, "pdf"), mimetype: "application/pdf", caption: `Ficha técnica - ${selectedNameForQuote}` });
            attachedSheetWithQuote = true;
          }
        }
      } catch {}

      strictReply = attachedSheetWithQuote
        ? `Listo. Ya generé la cotización de ${selectedNameForQuote} (${qty} unidad(es)) y te envío en este WhatsApp el PDF junto con la ficha técnica.`
        : `Listo. Ya generé la cotización de ${selectedNameForQuote} (${qty} unidad(es)) y te la envío en PDF por este WhatsApp.`;
      args.strictMemory.pending_post_quote_video_link = "";
      const youtubeLink = args.pickYoutubeVideoForModel(selectedNameForQuote);
      if (youtubeLink) args.strictMemory.pending_post_quote_video_link = youtubeLink;
    } else {
      strictReply = "Recibí tus datos, pero falló la generación automática de cotización en este intento. Escríbeme 'reenviar cotización' y la intento de nuevo por este WhatsApp.";
    }
  }

  args.strictMemory.awaiting_action = "conversation_followup";
  args.strictMemory.quote_data = {};
  args.strictMemory.quote_quantity = 1;
  args.strictMemory.last_intent = "quote_generated";
  args.strictMemory.conversation_status = "open";
  args.strictMemory.quote_feedback_due_at = args.isoAfterHours(24);

  return strictReply;
}
