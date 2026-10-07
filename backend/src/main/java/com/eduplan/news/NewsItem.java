package com.eduplan.news;

public record NewsItem(
        String title,
        String description,
        String link,
        String source,
        String publishedAt,
        String image
) {
}