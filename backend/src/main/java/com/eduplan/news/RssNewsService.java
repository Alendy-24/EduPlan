package com.eduplan.news;

import com.rometools.rome.feed.synd.SyndEntry;
import com.rometools.rome.feed.synd.SyndFeed;
import com.rometools.rome.io.SyndFeedInput;
import com.rometools.rome.io.XmlReader;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URL;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
public class RssNewsService {

    private static final List<RssSource> RSS_SOURCES = List.of(

            // Universidad Tecnológica de Santander
            new RssSource(
                    "Universitaria Tecnológica de Santander (UTS)",
                    "https://www.uts.edu.co/feed/"
            ),

            // Universidad de Santander
            new RssSource(
                    "Universidad de Santander (UDES)",
                    "https://bucaramanga.udes.edu.co/extension/noticias/author/70-comunicacionesbucaramanga?format=feed"
            ),

            // Universidad de los Andes
            new RssSource(
                    "Universidad de los Andes",
                    "https://sistemas.uniandes.edu.co/es/inicio/noticias?format=feed"
            ),

            // Universidad del Valle
            new RssSource(
                    "Universidad del Valle",
                    "https://www.univalle.edu.co/medio-ambiente/content/noticias-rectoria?format=feed"
            )
    );

    public List<NewsItem> getNoticias() {

        List<NewsItem> noticias = new ArrayList<>();

        for (RssSource source : RSS_SOURCES) {

            try {

                System.out.println(
                        "Obteniendo noticias de: "
                                + source.nombre()
                );

                noticias.addAll(
                        obtenerNoticiasDeFuente(source)
                );

                System.out.println(
                        "Noticias obtenidas de "
                                + source.nombre()
                                + ": "
                                + noticias.size()
                );

            } catch (Exception e) {

                System.out.println(
                        "No se pudieron obtener noticias de "
                                + source.nombre()
                                + ": "
                                + e.getMessage()
                );
            }
        }

        return noticias.stream()
                .sorted(
                        Comparator.comparing(
                                NewsItem::publishedAt,
                                Comparator.nullsLast(
                                        Comparator.reverseOrder()
                                )
                        )
                )
                .toList();
    }

    private List<NewsItem> obtenerNoticiasDeFuente(
            RssSource source
    ) throws Exception {

        URL url = URI.create(source.url()).toURL();

        try (XmlReader reader = new XmlReader(url)) {

            SyndFeed feed =
                    new SyndFeedInput().build(reader);

            return feed.getEntries()
                    .stream()
                    .map(entry ->
                            convertirNoticia(
                                    entry,
                                    source.nombre()
                            )
                    )
                    .toList();
        }
    }

    private NewsItem convertirNoticia(
            SyndEntry entry,
            String source
    ) {

        String description = "";

        if (entry.getDescription() != null) {

            description = limpiarDescripcion(
                    entry.getDescription().getValue()
            );
        }

        String publishedAt = "";

        if (entry.getPublishedDate() != null) {

            publishedAt = entry.getPublishedDate()
                    .toInstant()
                    .toString();
        }

        String image = obtenerImagen(
                entry.getLink()
        );

        return new NewsItem(
                entry.getTitle(),
                description,
                entry.getLink(),
                source,
                publishedAt,
                image
        );
    }

    private String limpiarDescripcion(
            String description
    ) {

        if (description == null ||
                description.isBlank()) {

            return "";
        }

        /*
         * El RSS de algunas universidades,
         * especialmente UDES, manda HTML dentro
         * de la descripción.
         *
         * Jsoup convierte ese HTML en texto limpio
         * y además decodifica entidades como:
         *
         * &#243; → ó
         * &#241; → ñ
         */
        String textoLimpio =
                Jsoup.parse(description).text();

        return textoLimpio
                .replace("&#8230;", "")
                .replace("[...]", "")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private String obtenerImagen(
            String noticiaUrl
    ) {

        if (noticiaUrl == null ||
                noticiaUrl.isBlank()) {

            return "";
        }

        try {

            Document document =
                    Jsoup.connect(noticiaUrl)
                            .userAgent("Mozilla/5.0")
                            .timeout(10000)
                            .get();

            /*
             * Primer intento:
             * imagen Open Graph.
             */
            Element ogImage =
                    document.selectFirst(
                            "meta[property=og:image]"
                    );

            if (ogImage != null) {

                String imageUrl =
                        ogImage.attr("content");

                if (!imageUrl.isBlank()) {
                    return imageUrl;
                }
            }

            /*
             * Segundo intento:
             * imagen dentro del artículo.
             */
            Element articleImage =
                    document.selectFirst(
                            "article img"
                    );

            if (articleImage != null) {

                String imageUrl =
                        articleImage.absUrl("src");

                if (!imageUrl.isBlank()) {
                    return imageUrl;
                }
            }

            /*
             * Último intento:
             * primera imagen de la página.
             */
            Element firstImage =
                    document.selectFirst("img");

            if (firstImage != null) {

                String imageUrl =
                        firstImage.absUrl("src");

                if (!imageUrl.isBlank()) {
                    return imageUrl;
                }
            }

        } catch (Exception e) {

            System.out.println(
                    "No se pudo obtener imagen para: "
                            + noticiaUrl
            );
        }

        return "";
    }

    private record RssSource(
            String nombre,
            String url
    ) {
    }
}